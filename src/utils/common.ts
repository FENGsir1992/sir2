// 通用工具函数库 - 减少重复代码

import { SYSTEM_CONSTANTS } from '../../backend/src/config/constants';
import { ValidationResult, ValidationRule } from '../types/shared';

// 通用验证函数
export const validators = {
  email: (email: string): ValidationResult => {
    if (!email.trim()) {
      return { isValid: false, message: '邮箱不能为空' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: '邮箱格式不正确' };
    }
    
    if (email.length > SYSTEM_CONSTANTS.USER.MAX_EMAIL_LENGTH) {
      return { isValid: false, message: `邮箱长度不能超过${SYSTEM_CONSTANTS.USER.MAX_EMAIL_LENGTH}个字符` };
    }
    
    return { isValid: true };
  },

  password: (password: string): ValidationResult => {
    if (!password.trim()) {
      return { isValid: false, message: '密码不能为空' };
    }
    
    if (password.length < SYSTEM_CONSTANTS.USER.MIN_PASSWORD_LENGTH) {
      return { isValid: false, message: `密码长度至少${SYSTEM_CONSTANTS.USER.MIN_PASSWORD_LENGTH}位` };
    }
    
    if (password.length > SYSTEM_CONSTANTS.USER.MAX_PASSWORD_LENGTH) {
      return { isValid: false, message: `密码长度不能超过${SYSTEM_CONSTANTS.USER.MAX_PASSWORD_LENGTH}位` };
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return { isValid: false, message: '密码必须包含大小写字母和数字' };
    }
    
    const weakPasswords = ['12345678', 'password', 'admin123', 'qwerty123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return { isValid: false, message: '密码过于简单，请使用更复杂的密码' };
    }
    
    return { isValid: true };
  },

  username: (username: string): ValidationResult => {
    if (!username.trim()) {
      return { isValid: false, message: '用户名不能为空' };
    }
    
    if (username.length < SYSTEM_CONSTANTS.USER.MIN_USERNAME_LENGTH) {
      return { isValid: false, message: `用户名至少需要${SYSTEM_CONSTANTS.USER.MIN_USERNAME_LENGTH}个字符` };
    }
    
    if (username.length > SYSTEM_CONSTANTS.USER.MAX_USERNAME_LENGTH) {
      return { isValid: false, message: `用户名不能超过${SYSTEM_CONSTANTS.USER.MAX_USERNAME_LENGTH}个字符` };
    }
    
    const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return { isValid: false, message: '用户名只能包含中文、英文、数字和下划线' };
    }
    
    return { isValid: true };
  },

  workflowTitle: (title: string): ValidationResult => {
    if (!title.trim()) {
      return { isValid: false, message: '标题不能为空' };
    }
    
    if (title.length > SYSTEM_CONSTANTS.WORKFLOW.MAX_TITLE_LENGTH) {
      return { isValid: false, message: `标题长度不能超过${SYSTEM_CONSTANTS.WORKFLOW.MAX_TITLE_LENGTH}个字符` };
    }
    
    return { isValid: true };
  },

  workflowDescription: (description: string): ValidationResult => {
    // 描述不再强制必填，仅做长度限制
    if (description.length > SYSTEM_CONSTANTS.WORKFLOW.MAX_DESCRIPTION_LENGTH) {
      return { isValid: false, message: `描述长度不能超过${SYSTEM_CONSTANTS.WORKFLOW.MAX_DESCRIPTION_LENGTH}个字符` };
    }
    
    return { isValid: true };
  },

  price: (price: number | string): ValidationResult => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      return { isValid: false, message: '价格必须是有效数字' };
    }
    
    if (numPrice < 0) {
      return { isValid: false, message: '价格不能为负数' };
    }
    
    if (numPrice > 999999.99) {
      return { isValid: false, message: '价格不能超过999,999.99' };
    }
    
    return { isValid: true };
  },

  tags: (tags: string[]): ValidationResult => {
    if (tags.length > SYSTEM_CONSTANTS.WORKFLOW.MAX_TAGS_COUNT) {
      return { isValid: false, message: `标签数量不能超过${SYSTEM_CONSTANTS.WORKFLOW.MAX_TAGS_COUNT}个` };
    }
    
    for (const tag of tags) {
      if (tag.length > SYSTEM_CONSTANTS.WORKFLOW.MAX_TAG_LENGTH) {
        return { isValid: false, message: `标签"${tag}"长度不能超过${SYSTEM_CONSTANTS.WORKFLOW.MAX_TAG_LENGTH}个字符` };
      }
    }
    
    return { isValid: true };
  }
};

// 通用格式化函数
export const formatters = {
  price: (price: number, currency = '¥'): string => {
    return `${currency}${price.toFixed(2)}`;
  },

  date: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  },

  datetime: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  fileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  number: (num: number): string => {
    return num.toLocaleString('zh-CN');
  },

  truncate: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },

  slug: (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

// 通用工具函数
export const utils = {
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  },

  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  generateId: (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
  },

  randomInt: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  clamp: (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max);
  },

  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => utils.deepClone(item)) as unknown as T;
    if (typeof obj === 'object') {
      const clonedObj = {} as T;
      Object.keys(obj).forEach(key => {
        (clonedObj as any)[key] = utils.deepClone((obj as any)[key]);
      });
      return clonedObj;
    }
    return obj;
  },

  isEmptyObject: (obj: any): boolean => {
    return obj && typeof obj === 'object' && Object.keys(obj).length === 0;
  },

  pick: <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  }
};

// 安全相关工具
export const security = {
  escapeHtml: (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;'
    };
    return text.replace(/[&<>"'/]/g, (s) => map[s]);
  },

  sanitizeInput: (input: string): string => {
    // 移除控制字符和不可见字符
    return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
  },

  sanitizeFilename: (filename: string): string => {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // 移除危险字符
      .replace(/\s+/g, '_') // 空格替换为下划线
      .slice(0, 255) // 限制长度
      .toLowerCase(); // 转小写
  },

  validateFileType: (file: File, allowedTypes: string[]): ValidationResult => {
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, message: `不支持的文件类型: ${file.type}` };
    }
    return { isValid: true };
  },

  validateFileSize: (file: File, maxSizeMB: number): ValidationResult => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return { 
        isValid: false, 
        message: `文件大小不能超过 ${maxSizeMB}MB，当前文件大小: ${formatters.fileSize(file.size)}` 
      };
    }
    return { isValid: true };
  }
};

// URL 和路由工具
export const urlUtils = {
  buildQuery: (params: Record<string, any>): string => {
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    return filtered ? `?${filtered}` : '';
  },

  parseQuery: (search: string): Record<string, string> => {
    const params = new URLSearchParams(search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  },

  joinPath: (...segments: string[]): string => {
    return segments
      .map(segment => segment.replace(/^\/+|\/+$/g, ''))
      .filter(segment => segment.length > 0)
      .join('/');
  },

  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

// 本地存储工具
export const storage = {
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  get: <T = any>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return defaultValue || null;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};

// 数组工具
export const arrayUtils = {
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },

  groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  sortBy: <T>(array: T[], keyOrFn: keyof T | ((item: T) => any), direction: 'asc' | 'desc' = 'asc'): T[] => {
    const getValue = typeof keyOrFn === 'function' ? keyOrFn : (item: T) => item[keyOrFn];
    
    return [...array].sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);
      
      if (direction === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });
  },

  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  difference: <T>(array1: T[], array2: T[]): T[] => {
    return array1.filter(item => !array2.includes(item));
  },

  intersection: <T>(array1: T[], array2: T[]): T[] => {
    return array1.filter(item => array2.includes(item));
  }
};

// 表单验证工具
export const formUtils = {
  validateField: (value: string, rules: ValidationRule): ValidationResult => {
    // 必填验证
    if (rules.required && !value.trim()) {
      return { isValid: false, message: '此字段为必填项' };
    }
    
    // 如果不是必填且为空，则跳过其他验证
    if (!rules.required && !value.trim()) {
      return { isValid: true };
    }
    
    // 最小长度验证
    if (rules.minLength && value.length < rules.minLength) {
      return { 
        isValid: false, 
        message: `至少需要 ${rules.minLength} 个字符` 
      };
    }
    
    // 最大长度验证
    if (rules.maxLength && value.length > rules.maxLength) {
      return { 
        isValid: false, 
        message: `不能超过 ${rules.maxLength} 个字符` 
      };
    }
    
    // 正则表达式验证
    if (rules.pattern && !rules.pattern.test(value)) {
      return { isValid: false, message: '格式不正确' };
    }
    
    // 自定义验证
    if (rules.custom) {
      return rules.custom(value);
    }
    
    return { isValid: true };
  },

  validateForm: (data: Record<string, string>, rules: Record<string, ValidationRule>): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};
    
    Object.entries(rules).forEach(([field, rule]) => {
      const value = data[field] || '';
      const result = formUtils.validateField(value, rule);
      
      if (!result.isValid && result.message) {
        errors[field] = result.message;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// 导出所有工具
export default {
  validators,
  formatters,
  utils,
  security,
  urlUtils,
  storage,
  arrayUtils,
  formUtils
};
