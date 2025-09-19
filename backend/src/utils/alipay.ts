// @ts-nocheck
import fs from 'fs';
import { getAlipayConfig } from '../config/alipay.js';

let cachedSdk: any | null = null;

async function getSdk(): Promise<any> {
    if (cachedSdk) return cachedSdk;
    const cfg = getAlipayConfig();
    const privateKey = fs.readFileSync(cfg.privateKeyPath, 'utf8').trim();
    const alipayPublicKey = fs.readFileSync(cfg.alipayPublicKeyPath, 'utf8').trim();
    const keyType = privateKey.includes('BEGIN PRIVATE KEY') ? 'PKCS8' : 'PKCS1';
    const config: any = {
        appId: cfg.appId,
        privateKey,
        alipayPublicKey: alipayPublicKey || '',
        gateway: cfg.gateway,
        signType: 'RSA2',
        keyType
    };
    const mod: any = await import('alipay-sdk');
    const Ctor: any = (mod && (mod.default || (mod as any).AlipaySdk)) || mod;
    if (typeof Ctor !== 'function') {
        throw new Error('Invalid alipay-sdk export: not a constructor');
    }
    cachedSdk = new Ctor(config);
    return cachedSdk;
}

export async function createPagePay(params: {
	outTradeNo: string;
	totalAmount: string; // 单位元，字符串
	subject: string;
	returnUrl?: string;
	notifyUrl?: string;
}): Promise<string> {
    const cfg = getAlipayConfig();
    const sdk = await getSdk();
    return sdk.pageExec('alipay.trade.page.pay', {
        method: 'GET',
		returnUrl: params.returnUrl || cfg.returnUrl || cfg.notifyUrl,
		notifyUrl: params.notifyUrl || cfg.notifyUrl,
		bizContent: {
			out_trade_no: params.outTradeNo,
			product_code: 'FAST_INSTANT_TRADE_PAY',
			total_amount: params.totalAmount,
			subject: params.subject,
		},
	});
}

export async function createWapPay(params: {
	outTradeNo: string;
	totalAmount: string;
	subject: string;
	quitUrl?: string;
	returnUrl?: string;
	notifyUrl?: string;
}): Promise<string> {
    const cfg = getAlipayConfig();
    const sdk = await getSdk();
    return sdk.pageExec('alipay.trade.wap.pay', {
        method: 'GET',
		returnUrl: params.returnUrl || cfg.returnUrl || cfg.notifyUrl,
		notifyUrl: params.notifyUrl || cfg.notifyUrl,
		bizContent: {
			out_trade_no: params.outTradeNo,
			product_code: 'QUICK_WAP_WAY',
			total_amount: params.totalAmount,
			subject: params.subject,
			quit_url: params.quitUrl || cfg.returnUrl || cfg.notifyUrl,
		},
	});
}

export async function precreateQr(params: {
	outTradeNo: string;
	totalAmount: string;
	subject: string;
}): Promise<{ qr_code: string }>{
    const sdk = await getSdk();
	const resp = await sdk.exec('alipay.trade.precreate', {
		out_trade_no: params.outTradeNo,
		total_amount: params.totalAmount,
		subject: params.subject,
		timeout_express: '15m',
	});
	const qrCode = (resp as any)?.qrCode ?? (resp as any)?.qr_code;
	return { qr_code: qrCode } as { qr_code: string };
}

export async function queryTrade(outTradeNo: string) {
    const sdk = await getSdk();
	return sdk.exec('alipay.trade.query', { out_trade_no: outTradeNo });
}

export async function closeTrade(outTradeNo: string) {
    const sdk = await getSdk();
	return sdk.exec('alipay.trade.close', { out_trade_no: outTradeNo });
}

export async function refundTrade(params: { outTradeNo: string; refundAmount: string; outRequestNo: string; reason?: string; }) {
    const sdk = await getSdk();
	return sdk.exec('alipay.trade.refund', {
		out_trade_no: params.outTradeNo,
		refund_amount: params.refundAmount,
		out_request_no: params.outRequestNo,
		refund_reason: params.reason,
	});
}

export function verifyNotifySign(params: Record<string, any>): boolean {
    // 同步验签：若 SDK 尚未初始化则返回 false，避免抛错导致上层误判
    if (!cachedSdk) {
        return false;
    }
    const sdk = cachedSdk;
    return sdk.checkNotifySign(params);
}

// 异步验签：确保 SDK 已初始化后再进行验签
export async function verifyNotifySignAsync(params: Record<string, any>): Promise<boolean> {
    const sdk = await getSdk();
    return sdk.checkNotifySign(params);
}
