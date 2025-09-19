import { Knex } from 'knex';

// 说明：SQLite 下需要通过重建表的方式修改枚举（CHECK 约束）
// 新集合：['pending', 'processing', 'shipping', 'completed', 'cancelled', 'refunded', 'paid']

export async function up(knex: Knex): Promise<void> {
  const client = knex.client.config.client;

  if (String(client).includes('sqlite')) {
    await knex.transaction(async (trx) => {
      // 创建新表（带 paid 状态）
      await trx.schema.createTable('orders_new', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('users').onDelete('CASCADE');
        table
          .enum('status', ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'refunded', 'paid'])
          .defaultTo('pending');
        table.decimal('totalAmount', 10, 2).notNullable();
        table.text('shippingAddress');
        table.string('trackingNumber');
        table.string('paymentMethod');
        table.string('paymentId');
        table.timestamp('createdAt').defaultTo(trx.fn.now());
        table.timestamp('updatedAt').defaultTo(trx.fn.now());

        table.index(['userId']);
        table.index(['status']);
        table.index(['createdAt']);
      });

      // 复制数据
      await trx.raw(
        `INSERT INTO orders_new (id, userId, status, totalAmount, shippingAddress, trackingNumber, paymentMethod, paymentId, createdAt, updatedAt)
         SELECT id, userId, status, totalAmount, shippingAddress, trackingNumber, paymentMethod, paymentId, createdAt, updatedAt FROM orders`
      );

      // 替换旧表
      await trx.schema.dropTable('orders');
      await trx.schema.renameTable('orders_new', 'orders');
    });
  } else {
    // 非 SQLite 数据库：尽量通过 ALTER 实现（视数据库而定）。
    // 如需适配其它数据库，可在此按需补充。
    // 这里保守处理：不做变更，避免在未知数据库上破坏结构。
    // 若你使用的是 Postgres 或 MySQL，请在此处添加相应 ALTER 语句。
  }
}

export async function down(knex: Knex): Promise<void> {
  const client = knex.client.config.client;

  if (String(client).includes('sqlite')) {
    await knex.transaction(async (trx) => {
      // 还原至原始集合（无 paid）
      await trx.schema.createTable('orders_old', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('users').onDelete('CASCADE');
        table
          .enum('status', ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'refunded'])
          .defaultTo('pending');
        table.decimal('totalAmount', 10, 2).notNullable();
        table.text('shippingAddress');
        table.string('trackingNumber');
        table.string('paymentMethod');
        table.string('paymentId');
        table.timestamp('createdAt').defaultTo(trx.fn.now());
        table.timestamp('updatedAt').defaultTo(trx.fn.now());

        table.index(['userId']);
        table.index(['status']);
        table.index(['createdAt']);
      });

      // 筛除不被旧枚举接受的状态（paid -> completed）
      await trx.raw(
        `INSERT INTO orders_old (id, userId, status, totalAmount, shippingAddress, trackingNumber, paymentMethod, paymentId, createdAt, updatedAt)
         SELECT id, userId,
                CASE WHEN status = 'paid' THEN 'completed' ELSE status END AS status,
                totalAmount, shippingAddress, trackingNumber, paymentMethod, paymentId, createdAt, updatedAt
         FROM orders`
      );

      await trx.schema.dropTable('orders');
      await trx.schema.renameTable('orders_old', 'orders');
    });
  } else {
    // 非 SQLite 数据库降级处理：不做变更
  }
}


