/**
 * 输入验证和安全工具函数
 */

/**
 * 邮箱验证
 */
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email.trim()) {
    return { isValid: false, message: '邮箱不能为空' };
  }
  
  // 更严格的邮箱正则表达式
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: '请输入有效的邮箱地址' };
  }
  
  // 检查常见的无效格式
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
    return { isValid: false, message: '邮箱格式不正确' };
  }
  
  if (email.length > 254) {
    return { isValid: false, message: '邮箱地址过长' };
  }
  
  return { isValid: true };
};

/**
 * 密码验证
 */
export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: '密码不能为空' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: '密码至少需要8个字符' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: '密码不能超过128个字符' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: '密码必须包含至少一个大写字母' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: '密码必须包含至少一个小写字母' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: '密码必须包含至少一个数字' };
  }
  
  // 检查常见弱密码
  const commonPasswords = ['12345678', 'password', 'qwerty123', 'abc123456'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, message: '密码过于简单，请使用更安全的密码' };
  }
  
  return { isValid: true };
};

/**
 * 用户名验证
 */
export const validateUsername = (username: string): { isValid: boolean; message?: string } => {
  if (!username.trim()) {
    return { isValid: false, message: '用户名不能为空' };
  }
  
  if (username.length < 2) {
    return { isValid: false, message: '用户名至少需要2个字符' };
  }
  
  if (username.length > 50) {
    return { isValid: false, message: '用户名不能超过50个字符' };
  }
  
  // 允许中文、英文、数字、下划线
  const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, message: '用户名只能包含中文、英文、数字和下划线' };
  }
  
  return { isValid: true };
};

/**
 * HTML转义，防止XSS攻击
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, (match) => map[match]);
};

/**
 * 清理用户输入，移除潜在危险字符
 */
export const sanitizeInput = (input: string): string => {
  // 移除控制字符和不可见字符
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
};

/**
 * 验证文件类型
 */
export const validateFileType = (file: File, allowedTypes: string[]): { isValid: boolean; message?: string } => {
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      message: `不支持的文件类型。允许的类型：${allowedTypes.join(', ')}` 
    };
  }
  
  return { isValid: true };
};

/**
 * 验证文件大小
 */
export const validateFileSize = (file: File, maxSizeInMB: number): { isValid: boolean; message?: string } => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  if (file.size > maxSizeInBytes) {
    return { 
      isValid: false, 
      message: `文件大小不能超过 ${maxSizeInMB}MB` 
    };
  }
  
  return { isValid: true };
};

/**
 * 通用表单验证器
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => { isValid: boolean; message?: string };
}

export const validateField = (
  value: string,
  rules: ValidationRule
): { isValid: boolean; message?: string } => {
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
};

/**
 * 批量验证表单字段
 */
export const validateForm = (
  formData: Record<string, string>,
  validationRules: Record<string, ValidationRule>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  for (const [fieldName, rules] of Object.entries(validationRules)) {
    const value = formData[fieldName] || '';
    const result = validateField(value, rules);
    
    if (!result.isValid && result.message) {
      errors[fieldName] = result.message;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
