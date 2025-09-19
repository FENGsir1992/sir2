import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';

// 简单的内存缓存 access_token（后续可迁移到数据库/Redis）
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getWeChatConfig() {
  const appid = process.env.WECHAT_APPID || '';
  const secret = process.env.WECHAT_SECRET || '';
  const token = process.env.WECHAT_TOKEN || '';
  const encodingAesKey = process.env.WECHAT_ENCODING_AES_KEY || '';
  return { appid, secret, token, encodingAesKey };
}

export function verifyWeChatSignature(params: {
  signature?: string;
  timestamp?: string;
  nonce?: string;
}): boolean {
  const { signature, timestamp, nonce } = params;
  const { token } = getWeChatConfig();
  if (!signature || !timestamp || !nonce || !token) return false;
  const str = [token, timestamp, nonce].sort().join('');
  const sha = crypto.createHash('sha1').update(str).digest('hex');
  return sha === signature;
}

export async function getAccessToken(): Promise<string> {
  const { appid, secret } = getWeChatConfig();
  if (!appid || !secret) {
    throw new Error('WECHAT_APPID/WECHAT_SECRET 未配置');
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 10_000) {
    return cachedAccessToken.token;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  const resp = await fetch(url);
  const data = await resp.json() as any;
  if (!resp.ok || !data.access_token) {
    throw new Error(`获取access_token失败: ${data.errmsg || resp.statusText}`);
  }
  cachedAccessToken = {
    token: data.access_token,
    // 官方返回 expires_in 秒，默认7200
    expiresAt: now + (Number(data.expires_in || 7200) * 1000),
  };
  return cachedAccessToken.token;
}

export async function createLoginQrcode(sceneStr: string, expireSeconds = 600): Promise<{ ticket: string; url: string; expireSeconds: number }>{
  const accessToken = await getAccessToken();
  const api = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;
  const payload = {
    expire_seconds: Math.min(Math.max(expireSeconds, 60), 2592000),
    action_name: 'QR_STR_SCENE',
    action_info: { scene: { scene_str: sceneStr } },
  };

  const resp = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json() as any;
  if (!resp.ok || !data.ticket) {
    throw new Error(`创建二维码失败: ${data.errmsg || resp.statusText}`);
  }
  return { ticket: data.ticket, url: data.url, expireSeconds: Number(data.expire_seconds || expireSeconds) };
}

export function getQrcodeImageUrl(ticket: string): string {
  const encoded = encodeURIComponent(ticket);
  return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encoded}`;
}

export function parseWeChatXml(xml: string): any {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const json = parser.parse(xml);
  // 微信XML最外层常为 <xml> ... </xml>
  return json.xml || json;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  console.warn('⚠️  警告: 使用默认JWT密钥，生产环境请设置JWT_SECRET环境变量');
  return 'wz-workflow-migration-secret-key-2024-CHANGE-THIS-IN-PRODUCTION';
}


