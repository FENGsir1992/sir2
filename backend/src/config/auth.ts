import { SECURITY_CONFIG } from './security.js';
import { log } from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT密钥获取和验证
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    const defaultSecret = 'wz-workflow-migration-secret-key-2024-CHANGE-THIS-IN-PRODUCTION';
    log.security('未设置JWT_SECRET环境变量，使用默认密钥（不安全）');
    return defaultSecret;
  }
  
  // 验证密钥强度
  if (secret.length < SECURITY_CONFIG.JWT_SECRET_MIN_LENGTH) {
    log.security(`JWT密钥长度不足: ${secret.length} < ${SECURITY_CONFIG.JWT_SECRET_MIN_LENGTH}`);
  }
  
  if (secret.includes('change-this') || secret.includes('CHANGE-THIS')) {
    log.security('检测到JWT密钥使用默认值，生产环境必须更改');
  }
  
  return secret;
}

// JWT过期时间配置
export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || SECURITY_CONFIG.JWT_DEFAULT_EXPIRES_IN;
}

// BCrypt轮次配置
export function getBcryptRounds(): number {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '0');
  return rounds > 0 ? rounds : SECURITY_CONFIG.BCRYPT_ROUNDS;
}

// 生成安全的JWT Token
export function generateSecureToken(payload: any): string {
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();
  
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn,
    issuer: 'wz-workflow-system',
    audience: 'wz-users',
    algorithm: 'HS256'
  } as jwt.SignOptions);
}

// 验证JWT Token
export function verifyToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const secret = getJwtSecret();
    
    jwt.verify(token, secret, {
      issuer: 'wz-workflow-system',
      audience: 'wz-users',
      algorithms: ['HS256']
    }, (err, decoded) => {
      if (err) {
        log.security('JWT验证失败', { error: err.message });
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

// 密码强度验证
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('密码长度至少8位');
  }
  
  if (password.length > 128) {
    errors.push('密码长度不能超过128位');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  
  if (!/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }
  
  // 检查常见弱密码
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'root', 'user', '12345678'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('密码过于简单，请使用更复杂的密码');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// 安全的密码哈希
export async function hashPassword(password: string): Promise<string> {
  const rounds = getBcryptRounds();
  return bcrypt.hash(password, rounds);
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 生成安全的随机字符串
export function generateSecureRandomString(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// 用户会话管理
export class SessionManager {
  private static activeSessions = new Map<string, { userId: string; createdAt: Date; lastActivity: Date }>();
  
  // 创建会话
  static createSession(userId: string): string {
    const sessionId = generateSecureRandomString(64);
    const now = new Date();
    
    this.activeSessions.set(sessionId, {
      userId,
      createdAt: now,
      lastActivity: now
    });
    
    log.audit('用户会话创建', { userId, sessionId });
    return sessionId;
  }
  
  // 验证会话
  static validateSession(sessionId: string): { valid: boolean; userId?: string } {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { valid: false };
    }
    
    // 检查会话是否过期 (24小时)
    const maxAge = 24 * 60 * 60 * 1000;
    const now = new Date();
    
    if (now.getTime() - session.lastActivity.getTime() > maxAge) {
      this.destroySession(sessionId);
      return { valid: false };
    }
    
    // 更新最后活动时间
    session.lastActivity = now;
    
    return { valid: true, userId: session.userId };
  }
  
  // 销毁会话
  static destroySession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      log.audit('用户会话销毁', { userId: session.userId, sessionId });
      this.activeSessions.delete(sessionId);
    }
  }
  
  // 销毁用户的所有会话
  static destroyUserSessions(userId: string): void {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(sessionId);
      }
    }
    log.audit('用户所有会话销毁', { userId });
  }
  
  // 获取活跃会话统计
  static getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
  
  // 清理过期会话
  static cleanupExpiredSessions(): number {
    const maxAge = 24 * 60 * 60 * 1000;
    const now = new Date();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.activeSessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log.info(`清理了 ${cleaned} 个过期会话`);
    }
    
    return cleaned;
  }
}

// 定期清理过期会话
setInterval(() => {
  SessionManager.cleanupExpiredSessions();
}, 60 * 60 * 1000); // 每小时清理一次

// 移除重复的导入声明，已在顶部导入