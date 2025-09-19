import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { SECURITY_CONFIG } from '../config/security.js';

// 开发环境跳过函数
const skipInDevelopment = (req: any) => {
  // 如果是开发环境且设置了跳过标志，则跳过限制
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true') {
    return true;
  }
  return false;
};

// 通用API速率限制
export const generalLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
  max: SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  // 根据IP和用户ID进行限制
  keyGenerator: (req) => {
    const userKey = (req as any).user?.id || 'anonymous';
    return `${req.ip}-${userKey}`;
  }
});

// 认证相关的严格限制
export const authLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
  max: SECURITY_CONFIG.RATE_LIMIT.AUTH_MAX_REQUESTS,
  message: {
    success: false,
    error: '登录尝试次数过多，请15分钟后再试',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  // 跳过成功的请求
  skipSuccessfulRequests: true
});

// 文件上传限制
export const uploadLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
  max: SECURITY_CONFIG.RATE_LIMIT.UPLOAD_MAX_REQUESTS,
  message: {
    success: false,
    error: '文件上传过于频繁，请稍后再试',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment
});

// 管理员操作限制
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 50, // 每5分钟最多50次管理操作
  message: {
    success: false,
    error: '管理操作过于频繁，请稍后再试',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment
});

// 慢速响应中间件 - 当请求频率接近限制时开始减慢响应
export const speedLimiter = slowDown({
  windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
  delayAfter: Math.floor(SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS * 0.7), // 达到70%限制时开始减慢
  delayMs: () => 500, // 每个请求延迟500ms
  maxDelayMs: 3000, // 最大延迟3秒
  validate: { delayMs: false }, // 禁用警告
  skip: skipInDevelopment
});

// 搜索API专用限制 - 防止搜索滥用
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: SECURITY_CONFIG.RATE_LIMIT.SEARCH_MAX_REQUESTS,
  message: {
    success: false,
    error: '搜索请求过于频繁，请稍后再试',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment
});

// 静态资源限制器 - 更宽松的限制
export const staticLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
  max: SECURITY_CONFIG.RATE_LIMIT.STATIC_MAX_REQUESTS,
  message: {
    success: false,
    error: '静态资源请求过于频繁，请稍后再试',
    code: 'STATIC_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  keyGenerator: (req) => {
    const userKey = (req as any).user?.id || 'anonymous';
    return `static-${req.ip}-${userKey}`;
  }
});

// 收藏检查专用限制器 - 针对频繁的收藏状态检查
export const favoritesLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: SECURITY_CONFIG.RATE_LIMIT.FAVORITES_MAX_REQUESTS,
  message: {
    success: false,
    error: '收藏检查请求过于频繁，请稍后再试',
    code: 'FAVORITES_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  keyGenerator: (req) => {
    const userKey = (req as any).user?.id || 'anonymous';
    return `favorites-${req.ip}-${userKey}`;
  }
});

// 根据环境调整限制
if (process.env.NODE_ENV === 'development') {
  // 开发环境放宽限制 - 注意：这些属性在运行时可能不可修改
  console.log('🔧 开发环境：使用宽松的速率限制配置');
  console.log(`📊 速率限制配置:
  - 通用API: ${SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS} 次/15分钟
  - 认证API: ${SECURITY_CONFIG.RATE_LIMIT.AUTH_MAX_REQUESTS} 次/15分钟  
  - 静态资源: ${SECURITY_CONFIG.RATE_LIMIT.STATIC_MAX_REQUESTS} 次/15分钟
  - 搜索API: ${SECURITY_CONFIG.RATE_LIMIT.SEARCH_MAX_REQUESTS} 次/分钟
  - 收藏检查: ${SECURITY_CONFIG.RATE_LIMIT.FAVORITES_MAX_REQUESTS} 次/分钟
  - 文件上传: ${SECURITY_CONFIG.RATE_LIMIT.UPLOAD_MAX_REQUESTS} 次/15分钟`);
}