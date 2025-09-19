import knex, { Knex } from 'knex';
import path from 'path';
import fs from 'fs';

// 使用进程工作目录作为项目根，避免在测试环境中依赖 import.meta/url
const projectRoot = path.resolve(process.cwd());

// 修复迁移路径/扩展名逻辑 - 兼容 tsx 与编译后运行
// 优先使用 dist 目录（匹配历史 .js 迁移记录），否则回退到源码目录
const distMigrations = path.join(projectRoot, 'dist', 'database', 'migrations');
const distSeeds = path.join(projectRoot, 'dist', 'database', 'seeds');
const srcMigrations = path.join(projectRoot, 'src', 'database', 'migrations');
const srcSeeds = path.join(projectRoot, 'src', 'database', 'seeds');

function dirExists(p: string): boolean {
  try { return fs.existsSync(p); } catch { return false; }
}

// 为避免与历史 knex_migrations 表中的 .js 文件名不一致，优先且尽量固定指向 dist/.js 目录
const migrationsDir = dirExists(distMigrations) ? distMigrations : srcMigrations;
const seedsDir = dirExists(distSeeds) ? distSeeds : srcSeeds;

// 解析数据库文件路径（支持相对路径）
const resolveDatabaseFilename = (): string => {
  const envDb = process.env.DATABASE_URL;
  if (envDb && envDb.trim().length > 0) {
    const v = envDb.trim();
    // 支持 SQLite 内存数据库与 URI 形式，保持原样
    if (v === ':memory:' || v.startsWith('file:')) return v;
    return path.isAbsolute(v) ? v : path.join(projectRoot, v);
  }
  return path.join(projectRoot, 'data', 'database.sqlite');
};

// 数据库配置
const isTestEnv = process.env.NODE_ENV === 'test';
const config: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: resolveDatabaseFilename()
  },
  useNullAsDefault: true,
  // SQLite连接池配置
  pool: isTestEnv ? { min: 1, max: 1 } : {
    min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
    max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
    acquireTimeoutMillis: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT || '30000'),
    idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '300000'),
    createTimeoutMillis: parseInt(process.env.DATABASE_CREATE_TIMEOUT || '30000'),
    destroyTimeoutMillis: parseInt(process.env.DATABASE_DESTROY_TIMEOUT || '5000'),
    reapIntervalMillis: parseInt(process.env.DATABASE_REAP_INTERVAL || '1000'),
    createRetryIntervalMillis: parseInt(process.env.DATABASE_CREATE_RETRY_INTERVAL || '200'),
  },
  migrations: {
    directory: migrationsDir,
    // 仅加载 .js，保证与 knex_migrations 中的历史记录一致
    loadExtensions: ['.js']
  },
  seeds: {
    directory: seedsDir,
    loadExtensions: ['.js']
  },
  // SQLite性能优化
  asyncStackTraces: process.env.NODE_ENV === 'development',
  debug: process.env.NODE_ENV === 'development' && process.env.LOG_LEVEL === 'debug',
};

export let db = knex(config);

function ensureDbForCurrentEnv() {
  try {
    const want = resolveDatabaseFilename();
    const current: any = (db as any)?.client?.config?.connection?.filename;
    if (process.env.NODE_ENV === 'test' && want && current && want !== current) {
      // 重新建立到测试内存库的连接
      (db as any).destroy && (db as any).destroy();
      db = knex({ ...config, connection: { filename: want } });
    }
  } catch {}
}

// 数据库初始化函数
export async function initDatabase() {
  try {
    ensureDbForCurrentEnv();
    // SQLite 运行期优化（并发与稳定性）
    try {
      await db.raw('PRAGMA journal_mode=WAL;');
      await db.raw('PRAGMA busy_timeout = 5000;');
      await db.raw('PRAGMA synchronous = NORMAL;');
    } catch (e) {
      console.warn('⚠️ 设置 SQLite PRAGMA 失败（可忽略）:', e);
    }
    // 确保数据目录存在
    if (config.connection && typeof config.connection === 'object' && 'filename' in config.connection) {
      const dataDir = path.dirname(config.connection.filename as string);
      const fs = await import('fs');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    // 测试环境禁用迁移，直接创建最小表结构
    if (process.env.NODE_ENV === 'test') {
      await ensureTestSchema();
      console.log('✅ 测试环境表结构已就绪');
    } else {
      // 运行迁移
      await db.migrate.latest();
      console.log('✅ 数据库迁移完成');
    }

    // 迁移后确保新增表/列（兼容已有数据文件）
    await ensureAdditionalSchema();

    // 是否需要在启动时写入种子数据
    const seedOnBootEnv = String(process.env.DB_SEED_ON_BOOT || '').toLowerCase() === 'true';
    const skipSeedEnv = String(process.env.DB_SKIP_SEED || '').toLowerCase() === 'true';
    let shouldSeed = false;

    if (seedOnBootEnv) {
      shouldSeed = true; // 显式要求种子
    } else if (skipSeedEnv) {
      shouldSeed = false; // 显式禁止
    } else if (process.env.NODE_ENV === 'development') {
      // 仅当数据库“看起来是空的”时才播种（避免每次重启重置数据）
      try {
        const hasUsers = await db.schema.hasTable('users');
        const hasWorkflows = await db.schema.hasTable('workflows');
        let userCount = 0;
        let workflowCount = 0;
        if (hasUsers) {
          const row = await db('users').count<{ count: number }>({ count: '*' }).first();
          userCount = Number(row?.count || 0);
        }
        if (hasWorkflows) {
          const row = await db('workflows').count<{ count: number }>({ count: '*' }).first();
          workflowCount = Number(row?.count || 0);
        }
        shouldSeed = userCount === 0 && workflowCount === 0;
        if (!shouldSeed) {
          console.log(`⏭️ 跳过种子：users=${userCount}, workflows=${workflowCount}`);
        }
      } catch (e) {
        console.warn('⚠️ 检查数据库是否为空失败，跳过种子检查：', e);
      }
    }

    if (shouldSeed) {
      await db.seed.run();
      console.log('✅ 种子数据插入完成');
    }

    return db;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

// 数据库连接测试
export async function testConnection() {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error);
    return false;
  }
}

// 优雅关闭数据库连接
export async function closeDatabase() {
  try {
    await db.destroy();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
  }
}

// 确保新增 schema：workflows.code、workflows.attachments、workflows.isDailyRecommended、workflow_codes 表
async function ensureAdditionalSchema() {
  try {
    const hasWorkflows = await db.schema.hasTable('workflows');
    if (hasWorkflows) {
      const hasCode = await db.schema.hasColumn('workflows', 'code');
      if (!hasCode) {
        await db.schema.alterTable('workflows', (table) => {
          table.integer('code').nullable().index();
        });
        console.log('🛠️ 已添加列 workflows.code');
      }

      const hasAttachments = await db.schema.hasColumn('workflows', 'attachments');
      if (!hasAttachments) {
        await db.schema.alterTable('workflows', (table) => {
          table.json('attachments').nullable();
        });
        console.log('🛠️ 已添加列 workflows.attachments');
      }

      // 新增：每日推荐标记
      const hasDaily = await db.schema.hasColumn('workflows', 'isDailyRecommended');
      if (!hasDaily) {
        await db.schema.alterTable('workflows', (table) => {
          table.boolean('isDailyRecommended').notNullable().defaultTo(false).index();
        });
        console.log('🛠️ 已添加列 workflows.isDailyRecommended');
      }
    }

    const hasWorkflowCodes = await db.schema.hasTable('workflow_codes');
    if (!hasWorkflowCodes) {
      await db.schema.createTable('workflow_codes', (table) => {
        table.integer('code').primary();
        table.boolean('assigned').notNullable().defaultTo(false).index();
        table.string('workflowId').nullable().index();
        table.timestamp('updatedAt').defaultTo(db.fn.now());
      });
      console.log('🛠️ 已创建表 workflow_codes');
    }
  } catch (error) {
    console.error('❌ 确保新增 schema 失败:', error);
  }
}

// 测试环境下的最小表结构
async function ensureTestSchema() {
  // users 表
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (table) => {
      table.string('id').primary();
      table.string('username');
      table.string('email').unique();
      table.string('passwordHash');
      table.string('avatar');
      table.boolean('isVip').defaultTo(false);
      table.boolean('isAdmin').defaultTo(false);
      table.float('balance').defaultTo(0);
      table.timestamp('vipExpiresAt').nullable();
      table.timestamp('createdAt').nullable();
      table.timestamp('updatedAt').nullable();
    });
  }

  // workflows 表（覆盖业务需要的主要字段）
  const hasWorkflows = await db.schema.hasTable('workflows');
  if (!hasWorkflows) {
    await db.schema.createTable('workflows', (table) => {
      table.string('id').primary();
      table.integer('code').nullable().index();
      table.string('title');
      table.text('description');
      table.string('shortDescription');
      table.string('author');
      table.string('authorId');
      table.string('authorAvatar');
      table.float('price').defaultTo(0);
      table.float('originalPrice').nullable();
      table.boolean('isVip').defaultTo(false);
      table.boolean('isFree').defaultTo(false);
      table.string('cover');
      table.string('previewVideo');
      table.string('demoVideo');
      table.text('gallery');
      table.text('attachments');
      table.string('category');
      table.string('subcategory');
      table.text('tags');
      table.string('status').index();
      table.integer('sortOrder').defaultTo(0);
      table.boolean('isHot').defaultTo(false);
      table.boolean('isNew').defaultTo(true);
      table.integer('workflowCount').defaultTo(1);
      table.integer('downloadCount').defaultTo(0);
      table.float('rating').defaultTo(0);
      table.integer('ratingCount').defaultTo(0);
      table.string('version');
      table.text('compatibility');
      table.text('dependencies');
      table.text('requirements');
      table.text('features');
      table.text('changelog');
      table.string('seoTitle');
      table.string('seoDescription');
      table.text('seoKeywords');
      table.text('content');
      table.integer('viewCount').defaultTo(0);
      table.boolean('isDailyRecommended').defaultTo(false);
      table.timestamp('publishedAt').nullable();
      table.timestamp('createdAt').nullable();
      table.timestamp('updatedAt').nullable();
    });
  }
  // 如果已存在，但缺少依赖字段，补齐
  else {
    const missingDeps = !(await db.schema.hasColumn('workflows', 'dependencies'));
    if (missingDeps) {
      await db.schema.alterTable('workflows', (table) => {
        table.text('dependencies');
      });
    }
  }

  // workflow_codes 表
  const hasWorkflowCodes = await db.schema.hasTable('workflow_codes');
  if (!hasWorkflowCodes) {
    await db.schema.createTable('workflow_codes', (table) => {
      table.integer('code').primary();
      table.boolean('assigned').notNullable().defaultTo(false).index();
      table.string('workflowId').nullable().index();
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
  }

  // orders 表
  const hasOrders = await db.schema.hasTable('orders');
  if (!hasOrders) {
    await db.schema.createTable('orders', (table) => {
      table.string('id').primary();
      table.string('userId').index();
      table.string('status').index();
      table.timestamp('createdAt').nullable();
    });
  }

  // order_items 表
  const hasOrderItems = await db.schema.hasTable('order_items');
  if (!hasOrderItems) {
    await db.schema.createTable('order_items', (table) => {
      table.string('id').primary();
      table.string('orderId').index();
      table.string('workflowId').index();
    });
  }
}
