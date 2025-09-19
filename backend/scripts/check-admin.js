#!/usr/bin/env node

/**
 * 管理员账户检查脚本
 * 运行方式: node backend/scripts/check-admin.js
 */

import knex from 'knex';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '..', 'data', 'database.sqlite')
  },
  useNullAsDefault: true
});

async function checkAdmin() {
  try {
    console.log('🔍 正在检查管理员账户...\n');

    // 1. 检查数据库连接
    console.log('1. 检查数据库连接...');
    await db.raw('SELECT 1');
    console.log('✅ 数据库连接正常\n');

    // 2. 检查users表是否存在
    console.log('2. 检查users表...');
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log('❌ users表不存在，请运行数据库迁移');
      return;
    }
    console.log('✅ users表存在\n');

    // 3. 查找管理员账户
    console.log('3. 查找管理员账户...');
    const adminUser = await db('users')
      .where('email', 'admin@wz.com')
      .first();

    if (!adminUser) {
      console.log('❌ 管理员账户不存在 (admin@wz.com)');
      console.log('📝 建议重新运行种子数据: npm run seed\n');
      
      // 检查是否有其他用户
      const allUsers = await db('users').select('id', 'username', 'email');
      if (allUsers.length > 0) {
        console.log('📋 现有用户列表:');
        allUsers.forEach(user => {
          console.log(`   - ${user.username} (${user.email})`);
        });
      } else {
        console.log('📋 数据库中无任何用户，请运行种子数据');
      }
      return;
    }

    console.log('✅ 找到管理员账户');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   用户名: ${adminUser.username}`);
    console.log(`   邮箱: ${adminUser.email}`);
    console.log(`   VIP状态: ${adminUser.isVip ? '是' : '否'}`);
    console.log(`   余额: ¥${adminUser.balance}`);
    // 如果需要，强制将该账户设为VIP
    if (!adminUser.isVip) {
      console.log('\n🔧 将 admin@wz.com 设为 VIP...');
      await db('users').where('id', adminUser.id).update({ isVip: 1, updatedAt: new Date() });
      console.log('✅ 已设为 VIP');
    }
    
    // 4. 验证密码hash
    console.log('\n4. 验证密码hash...');
    const testPassword = '123456';
    const isValidPassword = await bcrypt.compare(testPassword, adminUser.passwordHash);
    
    if (isValidPassword) {
      console.log('✅ 密码hash验证成功 (123456)');
    } else {
      console.log('❌ 密码hash验证失败');
      console.log('🔧 正在重置密码为 123456...');
      
      const newPasswordHash = await bcrypt.hash(testPassword, 10);
      await db('users')
        .where('id', adminUser.id)
        .update({ passwordHash: newPasswordHash });
      
      console.log('✅ 密码重置完成');
    }

    // 5. 检查workflows表是否有数据
    console.log('\n5. 检查工作流数据...');
    const workflowCount = await db('workflows').count('* as count').first();
    console.log(`📊 工作流数量: ${workflowCount.count}`);

    console.log('\n🎉 检查完成！管理员账户状态正常');
    console.log('🔑 登录信息:');
    console.log('   邮箱: admin@wz.com');
    console.log('   密码: 123456');

  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  } finally {
    await db.destroy();
  }
}

// 主函数包装器，用于处理 ES modules
async function main() {
  await checkAdmin();
}

main().catch(console.error);

