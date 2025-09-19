// 安全配置验证和初始化
import { SECURITY_CONFIG, validateEnvironmentConfig } from './security.js';

// 运行时安全检查
export function performSecurityChecks(): { passed: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. 环境变量检查
  const envValidation = validateEnvironmentConfig();
  if (!envValidation.valid) {
    errors.push(...envValidation.errors);
  }

  // 2. JWT密钥强度检查
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < SECURITY_CONFIG.JWT_SECRET_MIN_LENGTH) {
      errors.push(`JWT_SECRET长度不足 (${jwtSecret.length} < ${SECURITY_CONFIG.JWT_SECRET_MIN_LENGTH})`);
    }
    
    if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production' || 
        jwtSecret.includes('change-this')) {
      errors.push('JWT_SECRET使用默认值，生产环境必须更改');
    }

    // 检查密钥复杂度
    const hasUpperCase = /[A-Z]/.test(jwtSecret);
    const hasLowerCase = /[a-z]/.test(jwtSecret);
    const hasNumbers = /\d/.test(jwtSecret);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(jwtSecret);
    
    if (process.env.NODE_ENV === 'production' && 
        (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChars)) {
      warnings.push('JWT_SECRET复杂度不足，建议包含大小写字母、数字和特殊字符');
    }
  }

  // 3. 生产环境安全检查
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CORS_ORIGIN) {
      warnings.push('生产环境未配置CORS_ORIGIN，可能导致安全风险');
    }

    if (process.env.LOG_LEVEL === 'debug') {
      warnings.push('生产环境不建议使用debug日志级别');
    }

    if (!process.env.FRONTEND_URL) {
      warnings.push('生产环境未配置FRONTEND_URL');
    }
  }

  // 4. 文件上传配置检查
  const maxFileSize = process.env.MAX_FILE_SIZE;
  if (maxFileSize && parseInt(maxFileSize) > 100 * 1024 * 1024) {
    warnings.push(`文件上传大小限制过大: ${Math.round(parseInt(maxFileSize) / 1024 / 1024)}MB`);
  }

  // 5. 数据库配置检查
  if (!process.env.DATABASE_URL) {
    warnings.push('未配置DATABASE_URL，使用默认数据库路径');
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors
  };
}

// 初始化时运行安全检查
export function initSecurityValidation(): void {
  console.log('🔒 正在进行安全配置检查...');
  
  const { passed, warnings, errors } = performSecurityChecks();

  // 输出警告
  if (warnings.length > 0) {
    console.log('⚠️  安全配置警告:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  // 输出错误
  if (errors.length > 0) {
    console.log('❌ 安全配置错误:');
    errors.forEach(error => console.log(`   - ${error}`));
  }

  // 生产环境下，如果有严重错误则退出
  if (!passed && process.env.NODE_ENV === 'production') {
    console.error('❌ 生产环境安全检查失败');
    process.exit(1);
  }

  if (passed && warnings.length === 0) {
    console.log('✅ 安全配置检查通过');
  } else if (passed) {
    console.log('✅ 安全配置检查通过 (有警告)');
  }
}

// 运行时安全监控
export function startSecurityMonitoring(): void {
  // 定期检查进程状态
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    // 内存使用警告
    if (heapUsedMB > 500) {
      console.warn(`⚠️  内存使用较高: ${heapUsedMB}MB / ${heapTotalMB}MB`);
    }
    
    // 运行时间监控
    const uptimeHours = Math.round(process.uptime() / 3600);
    if (uptimeHours > 0 && uptimeHours % 24 === 0) {
      console.log(`📊 服务器已运行 ${uptimeHours} 小时`);
    }
  }, 60000); // 每分钟检查一次
}

// 导出常用验证函数
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function isValidPassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: '密码长度至少8位' };
  }
  
  if (password.length > 128) {
    return { valid: false, reason: '密码长度不能超过128位' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return { valid: false, reason: '密码必须包含大小写字母和数字' };
  }
  
  // 检查常见弱密码
  const weakPasswords = ['12345678', 'password', 'admin123', 'qwerty123'];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, reason: '密码过于简单，请使用更复杂的密码' };
  }
  
  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  // 移除危险字符，保留安全字符
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // 移除危险字符
    .replace(/\s+/g, '_') // 空格替换为下划线
    .slice(0, 255) // 限制长度
    .toLowerCase(); // 转小写
}
