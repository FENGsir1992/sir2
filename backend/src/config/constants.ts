// 系统常量配置 - 解决硬编码问题
export const SYSTEM_CONSTANTS = {

  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    MIN_PAGE_SIZE: 1,
  },

  // 文件上传配置
  UPLOAD: {
    MAX_FILE_SIZE_MB: 100,
    MAX_FILES_PER_REQUEST: 5,
    ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    ALLOWED_VIDEO_EXTENSIONS: ['.mp4', '.webm', '.ogg'],
    ALLOWED_FILE_EXTENSIONS: ['.json', '.txt'],
  },

  // 用户配置
  USER: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    MIN_USERNAME_LENGTH: 2,
    MAX_USERNAME_LENGTH: 50,
    MAX_EMAIL_LENGTH: 255,
  },

  // 工作流配置
  WORKFLOW: {
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_SHORT_DESCRIPTION_LENGTH: 500,
    MAX_TAGS_COUNT: 20,
    MAX_TAG_LENGTH: 50,
    DEFAULT_WORKFLOW_COUNT: 1,
    INITIAL_DOWNLOAD_COUNT: 0,
    INITIAL_RATING: 0,
    INITIAL_RATING_COUNT: 0,
  },

  // 搜索配置
  SEARCH: {
    MIN_SEARCH_LENGTH: 1,
    MAX_SEARCH_LENGTH: 100,
    MAX_TAGS_IN_FILTER: 10,
  },

  // 速率限制
  RATE_LIMIT: {
    WINDOW_MINUTES: 15,
    MAX_REQUESTS_GENERAL: 100,
    MAX_REQUESTS_AUTH: 5,
    MAX_REQUESTS_UPLOAD: 10,
  },

  // JWT配置
  JWT: {
    MIN_SECRET_LENGTH: 32,
    DEFAULT_EXPIRES_IN: '7d',
    REFRESH_THRESHOLD_DAYS: 1,
  },

  // 数据库配置
  DATABASE: {
    DEFAULT_POOL_MIN: 2,
    DEFAULT_POOL_MAX: 10,
    DEFAULT_ACQUIRE_TIMEOUT: 30000,
    DEFAULT_IDLE_TIMEOUT: 300000,
    DEFAULT_CREATE_TIMEOUT: 30000,
    DEFAULT_DESTROY_TIMEOUT: 5000,
    DEFAULT_REAP_INTERVAL: 1000,
    DEFAULT_CREATE_RETRY_INTERVAL: 200,
  },

  // 状态常量
  STATUS: {
    WORKFLOW: ['draft', 'published', 'archived', 'featured'] as const,
    ORDER: ['pending', 'paid', 'cancelled', 'refunded'] as const,
    PAYMENT: ['pending', 'success', 'failed'] as const,
  },

  // 默认测试数据
  DEFAULT_USERS: {
    ADMIN: {
      email: 'admin@wz.com',
      username: '管理员',
      password: '123456'
    },
    USER1: {
      email: 'user1@wz.com', 
      username: '测试用户1',
      password: '123456'
    },
    USER2: {
      email: 'user2@wz.com',
      username: '测试用户2', 
      password: '123456'
    }
  },

  // 错误消息
  ERROR_MESSAGES: {
    UNAUTHORIZED: '需要认证才能访问',
    FORBIDDEN: '权限不足',
    NOT_FOUND: '资源不存在',
    VALIDATION_FAILED: '数据验证失败',
    INTERNAL_ERROR: '服务器内部错误',
    RATE_LIMITED: '请求过于频繁，请稍后再试',
    FILE_TOO_LARGE: '文件大小超出限制',
    INVALID_FILE_TYPE: '不支持的文件类型',
    DUPLICATE_EMAIL: '邮箱已被使用',
    WEAK_PASSWORD: '密码强度不足',
    INVALID_CREDENTIALS: '邮箱或密码错误',
  },

  // 成功消息
  SUCCESS_MESSAGES: {
    CREATED: '创建成功',
    UPDATED: '更新成功',
    DELETED: '删除成功',
    UPLOADED: '上传成功',
    LOGIN_SUCCESS: '登录成功',
    LOGOUT_SUCCESS: '登出成功',
    REGISTER_SUCCESS: '注册成功',
  }
} as const;

// 类型导出
export type WorkflowStatus = typeof SYSTEM_CONSTANTS.STATUS.WORKFLOW[number];
export type OrderStatus = typeof SYSTEM_CONSTANTS.STATUS.ORDER[number];
export type PaymentStatus = typeof SYSTEM_CONSTANTS.STATUS.PAYMENT[number];

// 工具函数
export function isValidWorkflowStatus(status: string): status is WorkflowStatus {
  return SYSTEM_CONSTANTS.STATUS.WORKFLOW.includes(status as WorkflowStatus);
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return SYSTEM_CONSTANTS.STATUS.ORDER.includes(status as OrderStatus);
}

export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return SYSTEM_CONSTANTS.STATUS.PAYMENT.includes(status as PaymentStatus);
}

// 获取环境特定的配置
export function getEnvironmentConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    isProduction,
    isDevelopment,
    corsOrigins: process.env.CORS_ORIGIN?.split(',') || [],
    maxFileSize: isProduction 
      ? SYSTEM_CONSTANTS.UPLOAD.MAX_FILE_SIZE_MB / 2 // 生产环境更严格
      : SYSTEM_CONSTANTS.UPLOAD.MAX_FILE_SIZE_MB,
    rateLimit: {
      windowMs: SYSTEM_CONSTANTS.RATE_LIMIT.WINDOW_MINUTES * 60 * 1000,
      max: isProduction 
        ? SYSTEM_CONSTANTS.RATE_LIMIT.MAX_REQUESTS_GENERAL / 2
        : SYSTEM_CONSTANTS.RATE_LIMIT.MAX_REQUESTS_GENERAL
    }
  };
}
