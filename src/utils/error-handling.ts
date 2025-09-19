// 统一错误处理系统 - 前端

import { ApiResponse } from '../types/shared';

// 错误类型定义
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message = '网络连接错误', details?: any) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message = '数据验证失败', details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = '认证失败，请重新登录') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends AppError {
  constructor(message = '权限不足') {
    super(message, 'PERMISSION_ERROR', 403);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends AppError {
  constructor(message = '服务器内部错误') {
    super(message, 'SERVER_ERROR', 500);
    this.name = 'ServerError';
  }
}

// 错误处理工具
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: AppError) => void> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // 添加错误监听器
  addErrorListener(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  // 移除错误监听器
  removeErrorListener(listener: (error: AppError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  // 处理错误
  handleError(error: unknown): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      // 根据错误消息判断错误类型
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        appError = new NetworkError(error.message);
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        appError = new AuthenticationError();
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        appError = new PermissionError();
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        appError = new NotFoundError();
      } else if (error.message.includes('400') || error.message.includes('validation')) {
        appError = new ValidationError(error.message);
      } else if (error.message.includes('500') || error.message.includes('Server')) {
        appError = new ServerError(error.message);
      } else {
        appError = new AppError(error.message, 'UNKNOWN_ERROR');
      }
    } else {
      appError = new AppError('未知错误', 'UNKNOWN_ERROR');
    }

    // 记录错误
    this.logError(appError);

    // 通知监听器
    this.errorListeners.forEach(listener => {
      try {
        listener(appError);
      } catch (listenerError) {
        console.error('Error listener failed:', listenerError);
      }
    });

    return appError;
  }

  // 记录错误
  private logError(error: AppError): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 开发环境下输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error('App Error:', errorInfo);
    }

    // 这里可以添加错误上报逻辑
    // 可以集成 Sentry, LogRocket 等错误监控服务
  }
}

// API 响应处理器
export class ApiResponseHandler {
  static handle<T>(response: ApiResponse<T>): T {
    if (response.success && response.data !== undefined) {
      return response.data;
    }

    // 根据错误码抛出相应的错误
    const message = response.error || response.message || '请求失败';
    const code = response.code;

    switch (code) {
      case 'VALIDATION_ERROR':
        throw new ValidationError(message);
      case 'AUTH_ERROR':
      case 'NOT_AUTHENTICATED':
        throw new AuthenticationError(message);
      case 'PERMISSION_ERROR':
      case 'ADMIN_ACCESS_DENIED':
        throw new PermissionError(message);
      case 'NOT_FOUND':
      case 'WORKFLOW_NOT_FOUND':
      case 'USER_NOT_FOUND':
        throw new NotFoundError(message);
      case 'NETWORK_ERROR':
        throw new NetworkError(message);
      case 'SERVER_ERROR':
      case 'DATABASE_ERROR':
        throw new ServerError(message);
      default:
        throw new AppError(message, code);
    }
  }
}

// Fetch 请求包装器
export class SafeFetch {
  private static baseConfig: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  static async request<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const config = {
      ...SafeFetch.baseConfig,
      ...options,
      headers: {
        ...SafeFetch.baseConfig.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // 检查是否是JSON响应
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new ServerError('服务器返回了非JSON格式的响应');
      }

      const data = await response.json();

      // 即使HTTP状态码表示成功，也要检查业务逻辑是否成功
      if (!response.ok) {
        // 根据HTTP状态码抛出相应错误
        switch (response.status) {
          case 400:
            throw new ValidationError(data.error || data.message || '请求参数错误');
          case 401:
            throw new AuthenticationError(data.error || data.message);
          case 403:
            throw new PermissionError(data.error || data.message);
          case 404:
            throw new NotFoundError(data.error || data.message);
          case 429:
            throw new AppError('请求过于频繁，请稍后再试', 'RATE_LIMITED', 429);
          case 500:
          default:
            throw new ServerError(data.error || data.message || '服务器错误');
        }
      }

      return data;
    } catch (error) {
      // 网络错误或其他异常
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new NetworkError('网络连接失败，请检查网络连接');
      }

      throw new AppError(
        error instanceof Error ? error.message : '未知网络错误',
        'NETWORK_ERROR'
      );
    }
  }

  static async get<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return SafeFetch.request<T>(url, { ...options, method: 'GET' });
  }

  static async post<T>(url: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return SafeFetch.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put<T>(url: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return SafeFetch.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return SafeFetch.request<T>(url, { ...options, method: 'DELETE' });
  }
}

// React Hook for error handling
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance();

  const handleError = (error: unknown): AppError => {
    return errorHandler.handleError(error);
  };

  const handleAsyncError = async <T>(
    asyncFn: () => Promise<T>,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error);
      return fallback;
    }
  };

  return {
    handleError,
    handleAsyncError,
  };
}

// 边界情况处理工具
export class BoundaryHandler {
  // 安全的数组访问
  static safeArrayAccess<T>(array: T[], index: number, defaultValue?: T): T | undefined {
    if (!Array.isArray(array) || index < 0 || index >= array.length) {
      return defaultValue;
    }
    return array[index];
  }

  // 安全的对象属性访问
  static safeObjectAccess<T>(obj: any, path: string, defaultValue?: T): T | undefined {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current as T;
  }

  // 安全的JSON解析
  static safeJsonParse<T>(json: string, defaultValue?: T): T | undefined {
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  // 安全的数字转换
  static safeNumberConversion(value: any, defaultValue = 0): number {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  // 安全的字符串操作
  static safeStringOperation(
    str: any, 
    operation: (s: string) => string, 
    defaultValue = ''
  ): string {
    try {
      if (typeof str !== 'string') {
        return defaultValue;
      }
      return operation(str);
    } catch {
      return defaultValue;
    }
  }

  // 安全的日期解析
  static safeDateParse(dateStr: any, defaultValue?: Date): Date | undefined {
    try {
      if (!dateStr) return defaultValue;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? defaultValue : date;
    } catch {
      return defaultValue;
    }
  }

  // 空值检查和默认值
  static withDefault<T>(value: T | null | undefined, defaultValue: T): T {
    return value ?? defaultValue;
  }

  // 数组空值检查
  static ensureArray<T>(value: any): T[] {
    return Array.isArray(value) ? value : [];
  }

  // 对象空值检查
  static ensureObject(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 导出工具函数
export {
  ApiResponseHandler as responseHandler,
  SafeFetch as safeFetch,
  BoundaryHandler as boundaryHandler,
};
