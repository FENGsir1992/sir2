import { Router, Request, Response } from 'express';
import { db } from '../database/init.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authLimiter } from '../middleware/rate-limit.js';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { getJwtSecret, getJwtExpiresIn, getBcryptRounds } from '../config/auth.js';
import { log } from '../utils/logger.js';
import { cacheHelper } from '../utils/cache.js';
import { validateBody, validationSchemas, sanitizeInput } from '../middleware/input-validation.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// 登录/注册端点：忽略任何随请求携带的旧 Authorization 头，避免无效/过期 token 干扰
router.use(['/login', '/register'], (req, _res, next) => {
  try {
    if (req.headers && typeof req.headers === 'object') {
      if ((req.headers as any)['authorization']) {
        try { delete (req.headers as any)['authorization']; } catch {}
      }
    }
  } catch {}
  next();
});

// 统一从配置读取
const JWT_EXPIRES_IN = getJwtExpiresIn();

// JWT中间件
interface AuthRequest extends Request {
  user?: any;
}

function authenticateToken(req: AuthRequest, res: Response, next: any): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED, code: 'NOT_AUTHENTICATED' });
    return;
  }

  jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
    if (err) {
      res.status(401).json({ success: false, error: '无效的token', code: 'INVALID_TOKEN' });
      return;
    }
    req.user = user;
    next();
  });
}

// 用户注册
router.post('/register', 
  authLimiter, 
  sanitizeInput,
  validateBody(validationSchemas.userRegister),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, avatar } = req.body;

    // 检查邮箱是否已存在
    const existingUser = await db('users').where('email', email).first();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: SYSTEM_CONSTANTS.ERROR_MESSAGES.DUPLICATE_EMAIL,
        code: 'DUPLICATE_EMAIL'
      });
    }

    // 密码哈希
    const passwordHash = await bcrypt.hash(password, getBcryptRounds());

    // 创建用户
    const userId = uuidv4();
    const newUser = {
      id: userId,
      username,
      email,
      passwordHash,
      avatar: avatar || '/TX.jpg',
      isVip: false,
      balance: 0.00,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db('users').insert(newUser);

    // 生成JWT token
    const token = jwt.sign(
      { userId: userId, email: email },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // 返回用户信息（不包含密码）
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      isVip: newUser.isVip,
      balance: newUser.balance,
      vipExpiresAt: null,
      createdAt: newUser.createdAt
    };

    return res.status(201).json({
      success: true,
      message: SYSTEM_CONSTANTS.SUCCESS_MESSAGES.REGISTER_SUCCESS,
      data: {
        user: userResponse,
        token: token
      }
    });
  }));

// 用户登录
router.post('/login', 
  authLimiter,
  sanitizeInput,
  validateBody(validationSchemas.userLogin),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // 查找用户
    const user = await db('users').where('email', email).first();
    if (!user) {
      return res.status(401).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS, code: 'AUTH_ERROR' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS, code: 'AUTH_ERROR' });
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // 更新最后登录时间
    await db('users').where('id', user.id).update({
      updatedAt: new Date()
    });

    // 返回用户信息（不包含密码）
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isVip: user.isVip,
      balance: user.balance,
      vipExpiresAt: user.vipExpiresAt || null
    };

    console.log(`✅ 用户登录成功: ${email}`);

    return res.json({
      success: true,
      message: SYSTEM_CONSTANTS.SUCCESS_MESSAGES.LOGIN_SUCCESS,
      data: {
        user: userResponse,
        token: token
      }
    });
  }));

// 用户登出
router.post('/logout', authLimiter, async (req: Request, res: Response) => {
  try {
    // 注意：在无状态JWT系统中，登出主要是客户端删除token
    // 这里可以实现token黑名单机制，但为了简单起见，我们只返回成功状态
    res.json({
      success: true,
      message: SYSTEM_CONSTANTS.SUCCESS_MESSAGES.LOGOUT_SUCCESS
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 验证token
router.get('/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '无效的用户令牌',
        code: 'INVALID_TOKEN'
      });
    }

    // 获取用户最新信息
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 返回用户信息（不包含密码）
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isVip: user.isVip,
      balance: user.balance,
      vipExpiresAt: user.vipExpiresAt || null
    };

    return res.json({
      success: true,
      message: 'Token验证成功',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Token验证错误:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 刷新token
router.post('/refresh', authLimiter, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;

    if (!userId || !email) {
      return res.status(401).json({
        success: false,
        error: '无效的用户令牌',
        code: 'INVALID_TOKEN'
      });
    }

    // 生成新的JWT token
    const newToken = jwt.sign(
      { userId: userId, email: email },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    return res.json({
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Token刷新错误:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取当前登录用户资料
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED, code: 'NOT_AUTHENTICATED' });
    }
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在', code: 'USER_NOT_FOUND' });
    }
    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVip: user.isVip,
        balance: user.balance,
        vipExpiresAt: user.vipExpiresAt || null
      }
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

export default router;
