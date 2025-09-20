import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
// import { fileURLToPath } from 'url';
import { generalLimiter, speedLimiter, authLimiter, staticLimiter } from './middleware/rate-limit.js';
import { log } from './utils/logger.js';
import { cache, warmupCache } from './utils/cache.js';
import { initDatabase, testConnection, closeDatabase } from './database/init.js';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/error-handler.js';
import { setupSwagger } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin/index.js';
import workflowRoutes from './routes/workflows.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import favoriteRoutes from './routes/favorites.js';
import uploadsRoutes from './routes/uploads.js';
import paymentsRoutes from './routes/payments.js';
import reviewRoutes from './routes/reviews.js';
import recommendationRoutes from './routes/recommendations.js';
import wechatRoutes from './routes/wechat.js';
import userRoutes from './routes/users.js';
import wechatPayRoutes from './routes/wechatpay.js';
import alipayRoutes from './routes/alipay.js';
import { closeOverdueOrders } from './utils/pay-common.js';
import { ensureAdminUser } from './utils/ensure-admin.js';

// 统一定位到 backend/uploads（无论在 src 还是 dist 运行）
// 基于工作目录推断项目根，避免 import.meta 依赖
const BACKEND_ROOT_CANDIDATES = [
  path.resolve(process.cwd(), 'backend'),
  path.resolve(process.cwd())
];

// 更严格：既需存在 uploads 目录，又需存在 package.json，避免误命中 "backend/backend"
const BACKEND_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
  try {
    const uploadsPath = path.join(p, 'uploads');
    const isRealBackendRoot = fs.existsSync(uploadsPath) && fs.existsSync(path.join(p, 'package.json'));
    return isRealBackendRoot;
  } catch { return false; }
}) || path.resolve(process.cwd(), 'backend');

const UPLOAD_ROOT = path.join(BACKEND_ROOT, 'uploads');

// 加载环境变量：优先加载 env.local，其次 .env
(() => {
  const candidates = [
    path.join(process.cwd(), 'backend', 'env.local'),
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), 'env.local'),
    path.join(process.cwd(), '.env')
  ];

  const found = candidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  });

  if (found) {
    dotenv.config({ path: found });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🧩 使用环境文件: ${found}`);
    }
  } else {
    dotenv.config();
  }
})();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// 中间件配置
// 在反向代理（如 Nginx）后运行时，信任第一层代理，
// 以便 express-rate-limit 能正确识别客户端 IP（消除 X-Forwarded-For 警告）
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  // 允许跨源获取静态媒体资源（视频/图片），否则会被 CORP 拦截
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      // 允许 http 媒体资源（开发/内网场景），以便 <canvas> 能安全绘制
      imgSrc: ["'self'", "data:", "https:", "http:"],
    },
  },
}));

// 全局速率限制
// Rate limiting is already applied above

// CORS 配置：生产严格白名单，可选允许局域网（ALLOW_LAN=true）
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean) as string[];
const allowLan = String(process.env.ALLOW_LAN || '').toLowerCase() === 'true';

app.use(cors({
  origin: function (origin, callback) {
    // 允许无origin的请求（如移动应用、Postman等）
    if (!origin) return callback(null, true);
    
    // 检查是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // 局域网允许（需显式开启）
    if (allowLan && origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // 支持老版本浏览器
}));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.apiAccess(req, res, duration);
  });
  
  next();
});

// 应用速率限制
app.use(speedLimiter);
app.use(generalLimiter);

app.use(express.json({
  limit: '10mb',
  // 保留原始请求体（用于微信支付回调验签）
  verify: (req: any, _res, buf) => {
    try {
      req.rawBody = buf.toString('utf8');
    } catch {
      req.rawBody = undefined;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 应用专门的速率限制
app.use('/uploads', staticLimiter, express.static(UPLOAD_ROOT, {
  setHeaders: (res) => {
    // 与 Helmet 一致，放宽跨源资源策略，允许前端从不同端口/域名直接播放视频
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // 关键：允许跨域获取静态媒体用于 <canvas> 绘制（避免 tainted canvas）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Timing-Allow-Origin', '*');
    // 设置缓存头以减少重复请求
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1小时缓存
  }
}));

// 额外：明确为常见视频类型设置合理的 Content-Type，避免部分平台识别失败
app.get('/uploads/videos/:name', (req, res, next) => {
  const ext = path.extname(req.params.name).toLowerCase();
  if (ext === '.mp4') res.type('video/mp4');
  else if (ext === '.webm') res.type('video/webm');
  else if (ext === '.ogg' || ext === '.ogv') res.type('video/ogg');
  next();
});

// 健康检查端点 - 增强版
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 数据库连接检查
    const dbStatus = await testConnection();
    
    // 缓存状态检查
    const cacheStats = cache.getStats();
    
    // 内存使用检查
    const memoryUsage = process.memoryUsage();
    
    // 系统负载检查
    const uptime = process.uptime();
    
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.round(uptime),
      responseTime: `${responseTime}ms`,
      database: {
        status: dbStatus ? 'connected' : 'disconnected',
        type: 'sqlite'
      },
      cache: {
        status: 'active',
        stats: {
          general: cacheStats.general.keys,
          users: cacheStats.users.keys,
          workflows: cacheStats.workflows.keys
        }
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
      }
    };
    
    // 根据各项检查结果决定HTTP状态码
    const overallStatus = dbStatus ? 200 : 503;
    
    res.status(overallStatus).json(healthData);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// API 路由
app.use('/api', apiRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/wechat', wechatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pay/wechat', wechatPayRoutes);
app.use('/api/pay/alipay', alipayRoutes);

// 设置API文档
setupSwagger(app);

// 404处理中间件
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// 旧的错误处理（备用）
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 记录错误详情
  console.error('服务器错误:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // 根据错误类型返回适当的状态码和消息
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || '内部服务器错误';
  
  // 处理特定类型的错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '请求数据验证失败';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '认证失败';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = '权限不足';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = '数据冲突，请检查输入';
  }
  
  // 构建响应
  const response: any = {
    success: false,
    error: process.env.NODE_ENV === 'production' ? message : err.message,
    code: err.code || 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
    path: req.url
  };
  
  // 开发环境下包含更多调试信息
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
    response.details = {
      name: err.name,
      originalMessage: err.message
    };
  }
  
  res.status(statusCode).json(response);
});

// 缓存统计端点
app.get('/api/cache/stats', (req, res) => {
  const stats = cache.getStats();
  res.json({
    success: true,
    data: stats
  });
});

// 启动服务器
async function startServer() {
  try {
    // 设置全局错误处理
    setupGlobalErrorHandlers();
    
    // 初始化数据库
    console.log('🔄 正在初始化数据库...');
    await initDatabase();
    console.log('✅ 数据库初始化完成');
    
    // 自愈：确保管理员账户存在/可用（可通过 ADMIN_* 环境变量控制）
    try { await ensureAdminUser(); } catch {}
    
    // 预热缓存
    console.log('🔄 开始缓存预热...');
    await warmupCache();
    console.log('✅ 缓存预热完成');
    
    // 启动HTTP服务器，增加更好的配置
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔗 API文档: http://localhost:${PORT}/api`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    });

    // 服务器配置优化
    server.keepAliveTimeout = 5000;
    server.headersTimeout = 6000;
    server.timeout = 30000;

    // 处理服务器错误
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ 端口 ${PORT} 已被占用，请检查是否有其他服务在运行`);
        process.exit(1);
      } else {
        console.error('❌ 服务器错误:', error);
      }
    });

    server.on('clientError', (err, socket) => {
      console.log('🔌 客户端连接错误:', err.message);
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });

    // 定时扫描超时未支付订单并关单（默认每10分钟执行一次，超时30分钟）
    const scanIntervalMs = Math.max(60_000, Number(process.env.ORDER_AUTO_CLOSE_INTERVAL_MS || 10 * 60 * 1000));
    const overdueMs = Math.max(60_000, Number(process.env.ORDER_AUTO_CLOSE_AGE_MS || 30 * 60 * 1000));
    const interval = setInterval(async () => {
      try {
        const { closedOrders, affectedPayments } = await closeOverdueOrders({ olderThanMs: overdueMs, limit: 200 });
        if (closedOrders > 0 || affectedPayments > 0) {
          console.log(`⏱️ 自动关单：closedOrders=${closedOrders}, affectedPayments=${affectedPayments}`);
        }
      } catch (e) {
        console.error('自动关单任务失败:', e);
      }
    }, scanIntervalMs);

    // 优雅关闭时清理定时器
    const originalClose = server.close.bind(server);
    (server as any).close = (...args: any[]) => {
      clearInterval(interval);
      return originalClose(...args);
    };

    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 收到 ${signal} 信号，开始优雅关闭...`);
      
      server.close(async () => {
        console.log('🔌 HTTP 服务器已关闭');
        
        try {
          await closeDatabase();
          console.log('✅ 优雅关闭完成');
          process.exit(0);
        } catch (error) {
          console.error('❌ 关闭过程中出错:', error);
          process.exit(1);
        }
      });
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动应用（测试环境不监听端口，便于 Jest 使用 app 实例）
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
