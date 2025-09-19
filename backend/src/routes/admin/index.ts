import { Router, Request, Response } from 'express';
import workflowsRouter from './workflows.js';
import mediaRouter from './media.js';
import { closeOverdueOrders } from '../../utils/pay-common.js';

const router = Router();

// 管理员API根路径信息
router.get('/', (req, res) => {
  res.json({
    message: 'WZ工作流迁移系统 - 管理员API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      users: '/api/admin/users',
      orders: '/api/admin/orders',
      stats: '/api/admin/stats',
      workflows: '/api/admin/workflows',
      maintenance: '/api/admin/maintenance'
    }
  });
});

// 子路由
router.use('/workflows', workflowsRouter);
router.use('/media', mediaRouter);

// 维护相关（手动触发）
const maintenanceRouter = Router();

// 手动关单：扫描超时未支付订单并取消
maintenanceRouter.post('/close-overdue-orders', async (req: Request, res: Response) => {
  try {
    const olderThanMs = Number((req.body || {}).olderThanMs) || 30 * 60 * 1000; // 默认30分钟
    const limit = Math.min(Math.max(Number((req.body || {}).limit) || 100, 1), 1000);
    const result = await closeOverdueOrders({ olderThanMs, limit });
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message, code: 'SERVER_ERROR' });
  }
});

router.use('/maintenance', maintenanceRouter);

export default router;
