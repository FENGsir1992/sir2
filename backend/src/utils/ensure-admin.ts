import bcrypt from 'bcryptjs';
import { db } from '../database/init.js';
import { getBcryptRounds } from '../config/auth.js';
import { log } from '../utils/logger.js';

/**
 * 在应用启动时确保管理员账号存在；
 * - 通过环境变量 ADMIN_EMAIL/ADMIN_USERNAME/ADMIN_PASSWORD 配置
 * - 若不存在则创建；
 * - 若 ADMIN_ENSURE_RESET=true 且提供了 ADMIN_PASSWORD，则重置密码并确保管理员权限
 */
export async function ensureAdminUser(): Promise<void> {
  try {
    const hasUsers = await db.schema.hasTable('users');
    if (!hasUsers) {
      // 数据库尚未建表时跳过，由迁移完成后再执行其它读写
      log.info('ensureAdmin: users 表不存在，跳过');
      return;
    }

    const email = (process.env.ADMIN_EMAIL || 'admin@wz.com').trim();
    const username = (process.env.ADMIN_USERNAME || 'admin').trim();
    const rawPassword = (process.env.ADMIN_PASSWORD || '').trim();
    const shouldReset = String(process.env.ADMIN_ENSURE_RESET || '').toLowerCase() === 'true';

    if (!email) return;

    const existing = await db('users').where({ email }).first();
    const bcryptRounds = getBcryptRounds();

    if (!existing) {
      const password = rawPassword || '123456';
      const passwordHash = await bcrypt.hash(password, bcryptRounds);
      const now = new Date();
      await db('users').insert({
        id: (global as any).crypto?.randomUUID?.() || (await import('crypto')).randomUUID(),
        username,
        email,
        passwordHash,
        avatar: '/TX.jpg',
        isVip: 1,
        isAdmin: 1,
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });
      log.security('ensureAdmin: 已创建管理员账户', { email });
      return;
    }

    if (shouldReset && rawPassword) {
      const passwordHash = await bcrypt.hash(rawPassword, bcryptRounds);
      await db('users').where({ id: existing.id }).update({
        passwordHash,
        isVip: 1,
        isAdmin: 1,
        updatedAt: new Date(),
      });
      log.security('ensureAdmin: 已重置管理员密码并确保权限', { email });
      return;
    }

    // 存在则兜底确保权限位
    if (!existing.isAdmin || !existing.isVip) {
      await db('users').where({ id: existing.id }).update({
        isVip: 1,
        isAdmin: 1,
        updatedAt: new Date(),
      });
      log.security('ensureAdmin: 已校正管理员权限', { email });
    }
  } catch (error) {
    log.error('ensureAdmin: 执行失败', { error: (error as Error).message });
  }
}


