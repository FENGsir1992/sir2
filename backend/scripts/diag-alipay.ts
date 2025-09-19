// 诊断支付宝配置是否正确：直接请求 trade.query 并打印网关返回
// 运行：npm --prefix backend run diag:alipay（或 tsx backend/scripts/diag-alipay.ts）

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AlipaySdkImport = require('alipay-sdk');
import { getAlipayConfig } from '../src/config/alipay.js';

async function main() {
  try {
    const cfg = getAlipayConfig();
    const privateKey = fs.readFileSync(cfg.privateKeyPath, 'ascii');
    const alipayPublicKey = fs.readFileSync(cfg.alipayPublicKeyPath, 'ascii');
    const Ctor: any = (AlipaySdkImport as any).default || AlipaySdkImport;
    const sdk = new Ctor({
      appId: cfg.appId,
      privateKey,
      alipayPublicKey: alipayPublicKey || '',
      gateway: cfg.gateway,
      signType: 'RSA2'
    });

    const outTradeNo = 'diag_' + Date.now();
    const resp = await sdk.exec('alipay.trade.query', { out_trade_no: outTradeNo });
    // 正常情况下会返回 TRADE_NOT_EXIST（说明签名/网关等基本正确）
    console.log('OK:', JSON.stringify(resp));
  } catch (err: any) {
    // 打印尽可能多的错误信息
    const code = err?.code || err?.status || 'UNKNOWN';
    const subCode = err?.subCode || err?.error_response?.sub_code;
    const subMsg = err?.subMsg || err?.error_response?.sub_msg;
    const msg = err?.msg || err?.message;
    console.error('ALIPAY_DIAG_ERROR =>', { code, msg, subCode, subMsg, raw: err });
    process.exit(1);
  }
}

main();


