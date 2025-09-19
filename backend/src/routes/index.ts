import { Router } from 'express';

const router = Router();

// API 版本信息
router.get('/', (req, res) => {
  res.json({
    message: 'WZ工作流迁移系统 API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      workflows: '/api/workflows',
      users: '/api/users',
      orders: '/api/orders',
      uploads: '/api/uploads',
      payments: '/api/payments'
    }
  });
});

export default router;
