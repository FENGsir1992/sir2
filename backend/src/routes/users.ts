import { Router, Response } from 'express';
import { db } from '../database/init.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { SYSTEM_CONSTANTS } from '../config/constants.js';

const router = Router();

// 获取当前用户资料
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '未认证', code: 'AUTH_REQUIRED' });
    }

    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在', code: 'USER_NOT_FOUND' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVip: user.isVip,
        balance: user.balance,
        vipExpiresAt: user.vipExpiresAt || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// 更新当前用户资料（仅允许更新 username、avatar）
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '未认证', code: 'AUTH_REQUIRED' });
    }

    const { username, avatar } = req.body || {};

    // 简单校验
    if (username !== undefined) {
      const name = String(username).trim();
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ success: false, error: '用户名长度需在2-50之间', code: 'VALIDATION_ERROR' });
      }
    }

    const updateFields: any = { updatedAt: new Date() };
    if (username !== undefined) updateFields.username = String(username).trim();
    if (avatar !== undefined) updateFields.avatar = String(avatar);

    // 如果没有任何可更新字段
    const keys = Object.keys(updateFields).filter(k => k !== 'updatedAt');
    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: '无有效更新字段', code: 'VALIDATION_ERROR' });
    }

    await db('users').where('id', userId).update(updateFields);

    return res.json({ success: true, message: SYSTEM_CONSTANTS.SUCCESS_MESSAGES.UPDATED });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

export default router;


