import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { db } from '../database/init.js';
import { createLoginQrcode, getQrcodeImageUrl, parseWeChatXml, verifyWeChatSignature, getJwtSecret } from '../utils/wechat.js';
import Redis from 'ioredis';

const router = Router();

// 简单的本地内存会话，prod可迁移到Redis
type LoginState = {
  scene: string;
  status: 'pending' | 'scanned' | 'subscribed' | 'authorized' | 'expired' | 'error';
  wechatOpenId?: string;
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
  userId?: string;
};
//
// 会话存储：优先 Redis，未配置则回退到内存 Map
//
const redisUrl = process.env.REDIS_URL || '';
const redis = redisUrl ? new Redis(redisUrl) : null;

const loginSessions = new Map<string, LoginState>();

const PREFIX = 'wechat:login:';

async function storeSet(scene: string, state: LoginState, ttlSeconds: number) {
  if (redis) {
    try {
      await redis.set(PREFIX + scene, JSON.stringify(state), 'EX', Math.max(60, ttlSeconds));
      return;
    } catch (e) {
      // 回退内存
    }
  }
  loginSessions.set(scene, state);
}

async function storeGet(scene: string): Promise<LoginState | undefined> {
  if (redis) {
    try {
      const raw = await redis.get(PREFIX + scene);
      if (!raw) return undefined;
      return JSON.parse(raw) as LoginState;
    } catch (e) {
      // 回退内存
    }
  }
  return loginSessions.get(scene);
}

async function storeDelete(scene: string) {
  if (redis) {
    try { await redis.del(PREFIX + scene); } catch {}
  }
  loginSessions.delete(scene);
}

function pruneExpiredSessions(maxAgeMs = 15 * 60 * 1000) {
  const now = Date.now();
  for (const [scene, s] of loginSessions.entries()) {
    if (now - s.createdAt > maxAgeMs) {
      s.status = 'expired';
      s.updatedAt = now;
      loginSessions.delete(scene);
    }
  }
}

// 1) 生成带参二维码（场景值用于绑定PC会话）
router.post('/qrcode', async (req: Request, res: Response) => {
  try {
    if (!redis) pruneExpiredSessions();
    const scene = `login:${uuidv4()}`;
    const qr = await createLoginQrcode(scene, 600);
    const imageUrl = getQrcodeImageUrl(qr.ticket);

    const now = Date.now();
    const initial: LoginState = { scene, status: 'pending', createdAt: now, updatedAt: now };
    await storeSet(scene, initial, qr.expireSeconds || 600);

    return res.json({ success: true, data: { scene, imageUrl, expireSeconds: qr.expireSeconds } });
  } catch (error) {
    console.error('创建二维码失败:', error);
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2) 查询登录状态（前端轮询）
router.get('/status/:scene', async (req: Request, res: Response) => {
  try {
    if (!redis) pruneExpiredSessions();
    const scene = String((req.params as any).scene || '');
    if (!scene) {
      return res.json({ success: true, data: { status: 'expired' } });
    }
    const state = await storeGet(scene);
    if (!state) {
      return res.json({ success: true, data: { status: 'expired' } });
    }

    // 若已授权，返回用户token
    if (state.status === 'authorized' && state.userId) {
      // 为现有用户签发JWT
      const user = await db('users').where('id', state.userId).first();
      if (!user) {
        return res.json({ success: false, error: '用户不存在' });
      }
      const token = jwt.sign({ userId: user.id, email: user.email }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions);
      return res.json({ success: true, data: { status: state.status, token, user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVip: user.isVip,
        balance: user.balance,
        vipExpiresAt: user.vipExpiresAt || null,
      } } });
    }

    return res.json({ success: true, data: { status: state.status } });
  } catch (error) {
    console.error('查询登录状态失败:', error);
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3) 微信服务器校验（GET）
router.get('/callback', (req: Request, res: Response) => {
  const { signature, timestamp, nonce, echostr } = req.query as any;
  if (verifyWeChatSignature({ signature, timestamp, nonce })) {
    return res.send(echostr || '');
  }
  return res.status(401).send('invalid signature');
});

// 4) 事件推送处理（POST）
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { signature, timestamp, nonce } = req.query as any;
    if (!verifyWeChatSignature({ signature, timestamp, nonce })) {
      return res.status(401).send('invalid signature');
    }

    // 微信会推送 XML
    let raw = '';
    await new Promise<void>((resolve) => {
      req.setEncoding('utf8');
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => resolve());
    });

    const data = parseWeChatXml(raw);
    const event = (data.Event || '').toLowerCase();
    const fromUser = data.FromUserName;
    const eventKey = data.EventKey || '';

    // 处理 subscribe/scan
    if (event === 'subscribe') {
      // 未关注 -> 关注事件，EventKey为 qrscene_xxx
      const sceneStr = String(eventKey).replace(/^qrscene_/, '');
      await handleSceneLogin(sceneStr, fromUser, true);
    } else if (event === 'scan') {
      // 已关注 -> 扫码事件
      const sceneStr = String(eventKey);
      await handleSceneLogin(sceneStr, fromUser, false);
    }

    // 响应空串以快速返回
    return res.send('');
  } catch (error) {
    console.error('处理微信回调失败:', error);
    return res.send('');
  }
});

async function handleSceneLogin(sceneStr: string, openId: string, justSubscribed: boolean) {
  const state = await storeGet(sceneStr);
  if (!state) return;

  state.wechatOpenId = openId;
  state.status = justSubscribed ? 'subscribed' : 'scanned';
  state.updatedAt = Date.now();
  await storeSet(sceneStr, state, 600);

  // 策略：
  // - subscribe：首次关注 -> 授权
  // - scan（已关注扫码）：直接授权（老用户无需取关再关注）
  if (justSubscribed || state.status === 'scanned') {
    // 绑定或创建用户（本地存储）
    const syntheticEmail = `${openId}@wechat.local`;
    let user = await db('users').where('email', syntheticEmail).first();
    if (!user) {
      const userId = uuidv4();
      const newUser = {
        id: userId,
        username: `wx_${openId.slice(0, 8)}`,
        email: syntheticEmail,
        passwordHash: 'WECHAT_NO_PASSWORD',
        avatar: '/TX.jpg',
        isVip: false,
        balance: 0.00,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db('users').insert(newUser);
      user = newUser;
    }
    state.userId = user.id;
    state.status = 'authorized';
    state.updatedAt = Date.now();
    await storeSet(sceneStr, state, 600);
  }
}

export default router;


