import fs from 'fs';
import crypto from 'crypto';
// 使用 Node 18+ 全局 fetch，避免 ESM 解析问题
import { getWeChatPayConfig } from '../config/pay.js';

export interface WxV3RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // e.g. /v3/pay/transactions/native
  body?: any; // object will be JSON.stringified
}

export interface WxNativeCreateResp {
  code_url: string;
}

export interface WxH5CreateResp { h5_url: string }
export interface WxJsapiCreateResp { prepay_id: string }

function loadPrivateKey(): string {
  const cfg = getWeChatPayConfig();
  return fs.readFileSync(cfg.privateKeyPath, 'utf8');
}

function buildAuthorizationToken(method: string, canonicalUrl: string, body: string): string {
  const cfg = getWeChatPayConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonceStr}\n${body}\n`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  const signature = signer.sign(loadPrivateKey(), 'base64');

  const token = `mchid="${cfg.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${cfg.serialNo}",signature="${signature}"`;
  return `WECHATPAY2-SHA256-RSA2048 ${token}`;
}

export async function wxV3Request<T = any>({ method = 'POST', path, body }: WxV3RequestOptions): Promise<T> {
  const cfg = getWeChatPayConfig();
  const url = new URL(path, cfg.apiBaseUrl).toString();
  const json = body ? JSON.stringify(body) : '';
  const auth = buildAuthorizationToken(method, new URL(url).pathname + (new URL(url).search || ''), json);

  const resp = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      'Authorization': auth,
      'User-Agent': 'wz-backend-wechatpay/1.0.0'
    },
    body: json || undefined,
    timeout: 15000 as any
  } as any);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`WeChatPay API ${method} ${path} failed: ${resp.status} ${text}`);
  }

  return (await resp.json()) as T;
}

// 回调验签：使用微信平台证书公钥验证响应头签名
export function verifyCallbackSignature(headers: Record<string, string>, body: string, platformPublicKeyPem: string): boolean {
  const timestamp = headers['wechatpay-timestamp'] || headers['Wechatpay-Timestamp'] as any;
  const nonce = headers['wechatpay-nonce'] || headers['Wechatpay-Nonce'] as any;
  const signature = headers['wechatpay-signature'] || headers['Wechatpay-Signature'] as any;

  if (!timestamp || !nonce || !signature) return false;
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(message);
  verifier.end();
  try {
    return verifier.verify(platformPublicKeyPem, signature, 'base64');
  } catch {
    return false;
  }
}

// 解密回调 resource.ciphertext (AES-256-GCM)
export function decryptCallbackResource(associatedData: string, nonce: string, ciphertext: string): string {
  const cfg = getWeChatPayConfig();
  const key = Buffer.from(cfg.apiV3Key, 'utf8');
  const buffer = Buffer.from(ciphertext, 'base64');
  const authTag = buffer.slice(buffer.length - 16);
  const data = buffer.slice(0, buffer.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  if (associatedData) decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

export async function createNativeTransaction(params: {
  description: string;
  outTradeNo: string;
  totalAmountFen: number; // 分
  attach?: Record<string, any>;
}): Promise<WxNativeCreateResp> {
  const cfg = getWeChatPayConfig();
  const payload: any = {
    appid: cfg.appId,
    mchid: cfg.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: cfg.notifyUrl,
    amount: { total: params.totalAmountFen, currency: 'CNY' },
  };
  if (params.attach) payload.attach = JSON.stringify(params.attach);
  return wxV3Request<WxNativeCreateResp>({ method: 'POST', path: '/v3/pay/transactions/native', body: payload });
}

export async function createH5Transaction(params: {
  description: string;
  outTradeNo: string;
  totalAmountFen: number;
  attach?: Record<string, any>;
  payerClientIp?: string;
}): Promise<WxH5CreateResp> {
  const cfg = getWeChatPayConfig();
  const payload: any = {
    appid: cfg.appId,
    mchid: cfg.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: cfg.notifyUrl,
    amount: { total: params.totalAmountFen, currency: 'CNY' },
    scene_info: {
      payer_client_ip: params.payerClientIp || '127.0.0.1',
      h5_info: { type: 'Wap' }
    }
  };
  if (params.attach) payload.attach = JSON.stringify(params.attach);
  return wxV3Request<WxH5CreateResp>({ method: 'POST', path: '/v3/pay/transactions/h5', body: payload });
}

export async function createJsapiTransaction(params: {
  description: string;
  outTradeNo: string;
  totalAmountFen: number;
  openid: string;
  attach?: Record<string, any>;
}): Promise<WxJsapiCreateResp> {
  const cfg = getWeChatPayConfig();
  const payload: any = {
    appid: cfg.appId,
    mchid: cfg.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: cfg.notifyUrl,
    amount: { total: params.totalAmountFen, currency: 'CNY' },
    payer: { openid: params.openid }
  };
  if (params.attach) payload.attach = JSON.stringify(params.attach);
  return wxV3Request<WxJsapiCreateResp>({ method: 'POST', path: '/v3/pay/transactions/jsapi', body: payload });
}

export async function queryTransactionByOutTradeNo(outTradeNo: string): Promise<any> {
  const cfg = getWeChatPayConfig();
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(cfg.mchId)}`;
  return wxV3Request<any>({ method: 'GET', path });
}

// 关闭交易（关单）：仅适用于未成功支付的订单
export async function closeTransactionByOutTradeNo(outTradeNo: string): Promise<void> {
  const cfg = getWeChatPayConfig();
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}/close`;
  const body = { mchid: cfg.mchId };
  await wxV3Request<void>({ method: 'POST', path, body });
}


