import path from 'path';

export interface AlipayConfig {
	appId: string;
	privateKeyPath: string; // 商户应用私钥 PEM 文件路径
	alipayPublicKeyPath: string; // 支付宝公钥 PEM 文件路径（或证书模式下平台公钥）
	gateway: string; // 网关地址
	notifyUrl: string; // 异步通知地址
	returnUrl: string; // 同步返回地址
	useSandbox?: boolean; // 是否使用沙箱
}

export function getAlipayConfig(): AlipayConfig {
	const required = {
		appId: process.env.ALIPAY_APP_ID || '',
		privateKeyPath: process.env.ALIPAY_PRIVATE_KEY_PATH || '',
		notifyUrl: process.env.ALIPAY_NOTIFY_URL || '',
	};

	const missingKeys = Object.entries(required)
		.filter(([, v]) => !v)
		.map(([k]) => k);

	if (missingKeys.length > 0) {
		throw new Error(`缺少支付宝环境变量: ${missingKeys.join(', ')}`);
	}

	const useSandbox = (process.env.ALIPAY_USE_SANDBOX || '').toLowerCase() === 'true';
	const gateway = process.env.ALIPAY_GATEWAY
		|| (useSandbox ? 'https://openapi.alipaydev.com/gateway.do' : 'https://openapi.alipay.com/gateway.do');

	return {
		appId: required.appId,
		privateKeyPath: path.resolve(required.privateKeyPath),
		alipayPublicKeyPath: process.env.ALIPAY_PUBLIC_KEY_PATH ? path.resolve(process.env.ALIPAY_PUBLIC_KEY_PATH) : path.join(process.cwd(), 'certs', 'alipay_public_key.pem'),
		gateway,
		notifyUrl: required.notifyUrl,
		returnUrl: process.env.ALIPAY_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/alipay/return`,
		useSandbox,
	};
}
