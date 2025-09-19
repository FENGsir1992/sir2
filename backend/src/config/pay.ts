import path from 'path';
import fs from 'fs';

export interface WeChatPayConfig {
  appId: string;
  mchId: string;
  serialNo: string;
  privateKeyPath: string;
  apiV3Key: string;
  notifyUrl: string;
  apiBaseUrl: string;
  platformCertPath: string; // 用于回调验签
}

export function getWeChatPayConfig(): WeChatPayConfig {
  // 兼容两套命名：优先使用 WECHAT_PAY_*，否则回退到历史变量名
  const required = {
    appId: process.env.WECHAT_PAY_APPID || process.env.WECHAT_APPID || '',
    mchId: process.env.WECHAT_PAY_MCHID || process.env.WECHAT_MCH_ID || process.env.WECHAT_MCHID || '',
    serialNo: process.env.WECHAT_PAY_SERIAL_NO || process.env.WECHAT_SERIAL_NO || '',
    privateKeyPath: process.env.WECHAT_PAY_PRIVATE_KEY_PATH || process.env.WECHAT_PRIVATE_KEY_PATH || '',
    apiV3Key: process.env.WECHAT_PAY_APIV3_KEY || process.env.WECHAT_API_V3_KEY || '',
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || process.env.WECHAT_NOTIFY_URL || '',
  };

  const missingKeys = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missingKeys.length > 0) {
    throw new Error(`缺少微信支付环境变量: ${missingKeys.join(', ')}`);
  }

  const apiBase = process.env.WECHAT_PAY_API_BASE || process.env.WECHAT_API_BASE || 'https://api.mch.weixin.qq.com';
  const platformCertEnv = process.env.WECHAT_PAY_PLATFORM_CERT_PATH || process.env.WECHAT_PLATFORM_CERT_PATH;

  // 尝试在不同基准目录下解析证书路径（兼容从项目根或 backend 目录启动）
  const resolveWithBackendFallback = (p: string): string => {
    if (!p) return p;
    const candidates = [
      path.isAbsolute(p) ? p : path.resolve(p),
      path.resolve(process.cwd(), 'backend', p),
      path.resolve(process.cwd(), p)
    ];
    const found = candidates.find((c) => {
      try { return fs.existsSync(c); } catch { return false; }
    });
    return found || (path.isAbsolute(p) ? p : path.resolve(p));
  };

  return {
    appId: required.appId,
    mchId: required.mchId,
    serialNo: required.serialNo,
    privateKeyPath: resolveWithBackendFallback(required.privateKeyPath),
    apiV3Key: required.apiV3Key,
    notifyUrl: required.notifyUrl,
    apiBaseUrl: apiBase,
    platformCertPath: platformCertEnv
      ? resolveWithBackendFallback(platformCertEnv)
      : resolveWithBackendFallback(path.join('certs', 'wechatpay_platform_cert.pem')),
  };
}


