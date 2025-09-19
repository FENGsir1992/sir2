import winston from 'winston';
import path from 'path';

// 日志目录（基于进程工作目录）
const logDir = path.join(process.cwd(), 'logs');

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// 创建logger实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'wz-backend' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    // 访问日志
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 7
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 性能日志
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'wz-performance' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ]
});

// 安全日志
export const securityLogger = winston.createLogger({
  level: 'warn',
  format: logFormat,
  defaultMeta: { service: 'wz-security' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// 审计日志
export const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'wz-audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 30 // 保留更长时间的审计日志
    })
  ]
});

// 便捷的日志方法
export const log = {
  // 基础日志
  info: (message: string, meta?: any) => logger.info(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),

  // 性能日志
  performance: (message: string, meta?: any) => performanceLogger.info(message, meta),

  // 安全日志
  security: (message: string, meta?: any) => securityLogger.warn(message, meta),

  // 审计日志
  audit: (message: string, meta?: any) => auditLogger.info(message, meta),

  // API访问日志
  apiAccess: (req: any, res: any, responseTime: number) => {
    logger.info('API访问', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    });
  },

  // 数据库操作日志
  dbOperation: (operation: string, table: string, duration: number, meta?: any) => {
    performanceLogger.info('数据库操作', {
      operation,
      table,
      duration: `${duration}ms`,
      ...meta
    });
  },

  // 认证日志
  auth: (action: string, userId?: string, ip?: string, success?: boolean, meta?: any) => {
    const logLevel = success ? 'info' : 'warn';
    const logMethod = success ? auditLogger.info : securityLogger.warn;
    
    logMethod('认证操作', {
      action,
      userId,
      ip,
      success,
      timestamp: new Date().toISOString(),
      ...meta
    });
  },

  // 管理员操作日志
  adminAction: (action: string, adminId: string, targetId?: string, meta?: any) => {
    auditLogger.info('管理员操作', {
      action,
      adminId,
      targetId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }
};

// 未捕获异常处理
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'exceptions.log'),
    maxsize: 5242880,
    maxFiles: 5
  })
);

// 未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', {
    reason,
    promise: promise.toString()
  });
});

export default logger;

