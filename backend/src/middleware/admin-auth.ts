import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/init.js';
import { getJwtSecret } from '../config/auth.js';

// 扩展Request接口以包含用户信息
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isAdmin?: boolean;
  };
}

// 管理员权限验证中间件
export async function requireAdminAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: '需要管理员权限 - 未提供认证token',
        code: 'ADMIN_AUTH_REQUIRED'
      });
      return;
    }

    // 验证JWT token（运行时读取密钥）
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

    // 从数据库获取用户信息
    const user = await db('users').where('id', decoded.userId).first();
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // 检查管理员权限 - 支持多种管理员识别方式
    const isAdmin = user.email === 'admin@wz.com' || 
                   user.username === 'admin' || 
                   user.isAdmin === true ||
                   (process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.split(',').includes(user.email));
    
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: '需要管理员权限',
        code: 'ADMIN_REQUIRED'
      });
      return;
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: true
    };

    next();
  } catch (error) {
    console.error('管理员权限验证错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
}

// 可选的管理员权限验证中间件（用于某些可选的管理员功能）
export async function optionalAdminAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
        isAdmin: Boolean(isAdmin)
      };
    }

    next();
  } catch (error) {
    // 发生错误时仍然继续，但不设置用户信息
    next();
  }
}
