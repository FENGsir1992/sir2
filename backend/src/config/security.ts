import crypto from 'crypto';
// 安全配置常量
export const SECURITY_CONFIG = {
  // 密码哈希配置
  BCRYPT_ROUNDS: process.env.NODE_ENV === 'production' ? 12 : 10,
  
  // JWT配置
  JWT_SECRET_MIN_LENGTH: 32,
  JWT_DEFAULT_EXPIRES_IN: '7d',
  
  // 速率限制配置
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15分钟
    MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 200 : 1000, // 开发环境大幅放宽
    AUTH_MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 10 : 50, // 开发环境认证限制放宽
    STATIC_MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 500 : 2000, // 开发环境静态资源大幅放宽
    SEARCH_MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 30 : 100, // 开发环境搜索限制放宽
    FAVORITES_MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 60 : 200, // 开发环境收藏检查放宽
    UPLOAD_MAX_REQUESTS: process.env.NODE_ENV === 'production' ? 10 : 50, // 开发环境上传限制放宽
  },
  
  // 文件上传安全配置
  UPLOAD: {
    MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB，支持较大视频文件
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
    // 允许的通用文件类型（增加主流压缩包）
    ALLOWED_FILE_TYPES: [
      'application/json',
      'text/plain',
      // 压缩包
      'application/zip',
      'application/x-zip-compressed',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-tar',
      'application/gzip',
      'application/x-gzip',
      'application/x-bzip2',
      'application/x-xz',
      'application/octet-stream'
    ],
    MAX_FILES_PER_REQUEST: 10,
  },
  
  // CORS配置
  CORS: {
    CREDENTIALS: true,
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Version'],
  },
  
  // 会话配置
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24小时
    SECURE: process.env.NODE_ENV === 'production',
    HTTP_ONLY: true,
    SAME_SITE: 'lax' as const,
  },
  
  // 敏感信息验证
  SENSITIVE_PATHS: [
    '/api/admin',
    '/api/users/profile',
    '/api/payments',
    '/api/orders',
  ],
  
  // 环境变量验证
  REQUIRED_ENV_VARS: [
    'JWT_SECRET',
    'DATABASE_URL',
    'NODE_ENV',
  ],
  
  // 生产环境额外要求的环境变量
  PRODUCTION_ENV_VARS: [
    'CORS_ORIGIN',
    'FRONTEND_URL',
  ],
} as const;

// 验证环境变量配置
export function validateEnvironmentConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查必需的环境变量
  for (const envVar of SECURITY_CONFIG.REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`缺少必需的环境变量: ${envVar}`);
    }
  }
  
  // 生产环境额外检查
  if (process.env.NODE_ENV === 'production') {
    for (const envVar of SECURITY_CONFIG.PRODUCTION_ENV_VARS) {
      if (!process.env[envVar]) {
        errors.push(`生产环境缺少必需的环境变量: ${envVar}`);
      }
    }
  }
  
  // 检查JWT密钥强度
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < SECURITY_CONFIG.JWT_SECRET_MIN_LENGTH) {
    errors.push(`JWT_SECRET长度不足，最少需要${SECURITY_CONFIG.JWT_SECRET_MIN_LENGTH}个字符`);
  }
  
  // 检查是否使用默认值
  if (jwtSecret && jwtSecret.includes('change-this-in-production')) {
    errors.push('检测到JWT_SECRET使用默认值，生产环境必须更改');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// 生成安全的随机JWT密钥
export function generateSecureJWTSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}
