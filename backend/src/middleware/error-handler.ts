import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';

// 错误类型枚举
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE_ERROR',
  INTERNAL = 'INTERNAL_ERROR'
}

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public type: ErrorType;
  public isOperational: boolean;
  public code: string | undefined;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.INTERNAL,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 验证错误
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorType.VALIDATION, true, 'VALIDATION_FAILED', details);
  }
}

// 认证错误
export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 401, ErrorType.AUTHENTICATION, true, 'AUTHENTICATION_FAILED');
  }
}

// 授权错误
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, ErrorType.AUTHORIZATION, true, 'AUTHORIZATION_FAILED');
  }
}

// 资源未找到错误
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(`${resource}未找到`, 404, ErrorType.NOT_FOUND, true, 'RESOURCE_NOT_FOUND');
  }
}

// 冲突错误
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, ErrorType.CONFLICT, true, 'RESOURCE_CONFLICT', details);
  }
}

// 速率限制错误
export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super(message, 429, ErrorType.RATE_LIMIT, true, 'RATE_LIMIT_EXCEEDED');
  }
}

// 数据库错误
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, ErrorType.DATABASE, true, 'DATABASE_ERROR', {
      originalMessage: originalError?.message,
      stack: originalError?.stack
    });
  }
}

// 文件上传错误
export class FileUploadError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorType.FILE_UPLOAD, true, 'FILE_UPLOAD_ERROR', details);
  }
}

// 外部API错误
export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, statusCode: number = 502) {
    super(`${service}服务错误: ${message}`, statusCode, ErrorType.EXTERNAL_API, true, 'EXTERNAL_API_ERROR');
  }
}

// 错误处理中间件
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let appError: AppError;

  // 如果不是AppError实例，转换为AppError
  if (!(error instanceof AppError)) {
    appError = convertToAppError(error);
  } else {
    appError = error;
  }

  // 记录错误日志
  logError(appError, req);

  // 发送错误响应
  sendErrorResponse(appError, res);
}

// 将普通错误转换为AppError
function convertToAppError(error: Error): AppError {
  // JWT错误
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return new AuthenticationError('认证token无效或已过期');
  }

  // 验证错误
  if (error.name === 'ValidationError') {
    return new ValidationError('数据验证失败', error.message);
  }

  // SQLite错误
  if (error.message.includes('SQLITE_CONSTRAINT')) {
    if (error.message.includes('UNIQUE')) {
      return new ConflictError('数据已存在，违反唯一性约束');
    }
    if (error.message.includes('FOREIGN KEY')) {
      return new ValidationError('外键约束违反');
    }
    return new DatabaseError('数据库约束错误', error);
  }

  // 文件大小错误
  if (error.message.includes('File too large')) {
    return new FileUploadError('文件大小超出限制');
  }

  // Multer错误
  if (error.message.includes('Unexpected field')) {
    return new FileUploadError('不支持的文件字段');
  }

  // 网络超时错误
  if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
    return new AppError('请求超时', 408, ErrorType.EXTERNAL_API, true, 'REQUEST_TIMEOUT');
  }

  // 默认内部错误
  return new AppError(
    process.env.NODE_ENV === 'production' ? '服务器内部错误' : error.message,
    500,
    ErrorType.INTERNAL,
    false,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined
  );
}

// 记录错误日志
function logError(error: AppError, req: Request): void {
  const errorInfo = {
    type: error.type,
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
    stack: error.stack,
    details: error.details
  };

  if (error.statusCode >= 500) {
    // 服务器错误
    log.error('服务器错误', errorInfo);
  } else if (error.statusCode >= 400) {
    // 客户端错误
    log.warn('客户端错误', errorInfo);
  } else {
    // 其他错误
    log.info('应用错误', errorInfo);
  }

  // 安全相关错误单独记录
  if (error.type === ErrorType.AUTHENTICATION || error.type === ErrorType.AUTHORIZATION) {
    log.security('安全相关错误', errorInfo);
  }
}

// 发送错误响应
function sendErrorResponse(error: AppError, res: Response): void {
  const response: any = {
    success: false,
    error: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  };

  // 开发环境包含更多调试信息
  if (process.env.NODE_ENV !== 'production') {
    response.type = error.type;
    response.statusCode = error.statusCode;
    
    if (error.stack) {
      response.stack = error.stack;
    }
    
    if (error.details) {
      response.details = error.details;
    }
  }

  // 生产环境的安全处理
  if (process.env.NODE_ENV === 'production') {
    // 不暴露内部错误详情
    if (error.statusCode >= 500 && !error.isOperational) {
      response.error = '服务器内部错误';
      response.code = 'INTERNAL_SERVER_ERROR';
    }
  }

  res.status(error.statusCode).json(response);
}

// 404处理中间件
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`路径 ${req.originalUrl}`);
  next(error);
}

// 异步错误包装器
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 未捕获异常处理
export function setupGlobalErrorHandlers(): void {
  // 未捕获的Promise拒绝
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    log.error('未捕获的Promise拒绝', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
    
    // 优雅关闭
    process.exit(1);
  });

  // 未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    log.error('未捕获的异常', {
      message: error.message,
      stack: error.stack
    });
    
    // 优雅关闭
    process.exit(1);
  });

  // SIGTERM信号处理
  process.on('SIGTERM', () => {
    log.info('收到SIGTERM信号，开始优雅关闭');
    process.exit(0);
  });

  // SIGINT信号处理
  process.on('SIGINT', () => {
    log.info('收到SIGINT信号，开始优雅关闭');
    process.exit(0);
  });
}

export default errorHandler;
