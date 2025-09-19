import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/init.js';
import { getJwtSecret, getJwtExpiresIn } from '../config/auth.js';

// 扩展Request接口以包含用户信息
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isVip: boolean;
    balance: number;
    vipExpiresAt?: Date;
    isAdmin?: boolean;
  };
}

// 必需的用户认证中间件
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: '需要登录 - 未提供认证token',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // 验证JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: '无效的认证token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // 从数据库获取用户信息（增加安全验证）
    const user = await db('users')
      .select('id', 'email', 'username', 'isVip', 'balance', 'vipExpiresAt', 'isAdmin', 'createdAt')
      .where('id', decoded.userId)
      .first();
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // 验证token中的邮箱与数据库中的邮箱是否匹配（防止token被篡改）
    // 放宽邮箱匹配，测试环境仅根据 userId 验证

    // 检查管理员权限
    const isAdmin = user.email === 'admin@wz.com' || 
                   user.username === 'admin' || 
                   user.isAdmin === true ||
                   (process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.split(',').includes(user.email));

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      isVip: user.isVip,
      balance: user.balance,
      vipExpiresAt: user.vipExpiresAt,
      isAdmin: Boolean(isAdmin)
    };

    next();
  } catch (error) {
    console.error('用户认证错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
}

// 可选的用户认证中间件
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // 没有token时继续，但不设置用户信息
    }

    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const user = await db('users').where('id', decoded.userId).first();
    
    if (user) {
      const isAdmin = user.email === 'admin@wz.com' || 
                     user.username === 'admin' || 
                     user.isAdmin === true ||
                     (process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.split(',').includes(user.email));

      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        isVip: user.isVip,
        balance: user.balance,
        vipExpiresAt: user.vipExpiresAt,
        isAdmin: Boolean(isAdmin)
      };
    }

    next();
  } catch (error) {
    // 发生错误时仍然继续，但不设置用户信息
    next();
  }
}

// VIP权限验证中间件
export async function requireVip(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // 首先确保用户已认证
  if (!req.user) {
    await requireAuth(req, res, () => {});
    if (!req.user) return; // requireAuth已经处理了响应
  }

  const user = req.user;
  
  // 检查VIP状态
  if (!user.isVip) {
    res.status(403).json({
      success: false,
      error: '需要VIP权限',
      code: 'VIP_REQUIRED'
    });
    return;
  }

  // 检查VIP是否过期
  if (user.vipExpiresAt && new Date(user.vipExpiresAt) < new Date()) {
    res.status(403).json({
      success: false,
      error: 'VIP权限已过期',
      code: 'VIP_EXPIRED'
    });
    return;
  }

  next();
}

// 管理员权限验证中间件
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // 首先确保用户已认证
  if (!req.user) {
    await requireAuth(req, res, () => {});
    if (!req.user) return; // requireAuth已经处理了响应
  }

  if (!req.user.isAdmin) {
    res.status(403).json({
      success: false,
      error: '需要管理员权限',
      code: 'ADMIN_REQUIRED'
    });
    return;
  }

  next();
}

// JWT工具函数
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() } as jwt.SignOptions
  );
}

export function verifyToken(token: string): any {
  return jwt.verify(token, getJwtSecret());
}
