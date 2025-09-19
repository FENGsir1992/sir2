import { Router, Response } from 'express';
import { db } from '../database/init.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_CONSTANTS } from '../config/constants.js';

const router = Router();

// 创建支付（模拟/占位实现）
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, method } = req.body || {};
    if (!orderId || !method) {
      return res.status(400).json({ success: false, error: 'orderId 与 method 为必填', code: 'VALIDATION_ERROR' });
    }
    const order = await db('orders').where({ id: orderId, userId: req.user!.id }).first();
    if (!order) return res.status(404).json({ success: false, error: '订单不存在', code: 'ORDER_NOT_FOUND' });

    const paymentId = uuidv4();
    await db('payments').insert({
      id: paymentId,
      orderId: orderId,
      userId: req.user!.id,
      amount: order.totalAmount || 0,
      method,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(201).json({ success: true, data: { id: paymentId, status: 'pending' } });
  } catch (error) {
    console.error('创建支付失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// 查询支付状态
router.get('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pay = await db('payments').where({ id, userId: req.user!.id }).first();
    if (!pay) return res.status(404).json({ success: false, error: '支付不存在', code: 'PAYMENT_NOT_FOUND' });
    return res.json({ success: true, data: { id: pay.id, status: pay.status, method: pay.method } });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// 支付历史
router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Number((req.query as any)?.page || 1);
    const limit = Math.min(100, Number((req.query as any)?.limit || 20));
    const offset = (page - 1) * limit;
    const baseQuery = db('payments').where('userId', req.user!.id);
    const totalRow = await baseQuery.clone().count<{ count: number }>({ count: '*' }).first();
    const total = Number((totalRow as any)?.count || 0);
    const rows = await baseQuery.clone().orderBy('createdAt', 'desc').limit(limit).offset(offset);
    return res.json({ success: true, data: { payments: rows, pagination: { page, limit, total } } });
  } catch (error) {
    console.error('获取支付历史失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

export default router;


