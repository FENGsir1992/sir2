import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { createPagePay, createWapPay, precreateQr, queryTrade, refundTrade, closeTrade, verifyNotifySign, verifyNotifySignAsync } from '../utils/alipay.js';

const router = Router();

// 创建支付宝订单：支持三种场景 type=page|wap|qr
router.post('/create', requireAuth, async (req: AuthRequest, res: Response) => {
	try {
		const { orderId, type } = req.body || {};
		if (!orderId) {
			return res.status(400).json({ success: false, error: 'orderId 为必填', code: 'VALIDATION_ERROR' });
		}
		const scene: 'page' | 'wap' | 'qr' = (type || 'page').toLowerCase();

		// 【安全修复】验证订单归属：确保只能为自己的订单创建支付
		const currentUserId = req.user!.id;
		const order = await db('orders').where({ id: orderId, userId: currentUserId }).first();
		if (!order) {
			return res.status(404).json({ 
				success: false, 
				error: '订单不存在或无权限操作此订单', 
				code: 'ORDER_NOT_FOUND' 
			});
		}
		if (order.status === 'paid') return res.json({ success: true, data: { message: '订单已支付' } });

		const existingPayment = await db('payments')
			.where({ orderId, userId: req.user!.id, method: 'alipay' })
			.orderBy('createdAt', 'desc')
			.first();

		const paymentId = existingPayment?.id || uuidv4();
		const compact = (s: string) => String(s || '').replace(/-/g, '');
		const genOutTradeNo = () => (`ali${compact(orderId).slice(0,16)}${compact(paymentId).slice(0,32)}`).slice(0,64);
		let outTradeNo = existingPayment?.transactionId || genOutTradeNo();
		if (!outTradeNo || outTradeNo.length > 64) {
			outTradeNo = genOutTradeNo();
		}

		if (!existingPayment) {
			await db('payments').insert({
				id: paymentId,
				orderId,
				userId: req.user!.id,
				amount: order.totalAmount || 0,
				method: 'alipay',
				status: 'processing',
				transactionId: outTradeNo,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} else {
			await db('payments').where({ id: paymentId }).update({ status: 'processing', transactionId: outTradeNo, updatedAt: new Date() });
		}

		const totalAmount = Number(order.totalAmount).toFixed(2);
		let data: any = {};
		try {
			if (scene === 'qr') {
				const resp = await precreateQr({ outTradeNo, totalAmount, subject: `订单 ${orderId}` });
				if (!resp || !(resp as any).qr_code) throw new Error('NO_QR_CODE');
				data = { paymentId, qrCode: (resp as any).qr_code };
			} else if (scene === 'wap') {
				const ret = `${process.env.FRONTEND_URL || ''}/payment/alipay/return?orderId=${encodeURIComponent(orderId)}`;
				const url = await createWapPay({ outTradeNo, totalAmount, subject: `订单 ${orderId}`, returnUrl: ret });
				data = { paymentId, payUrl: url };
			} else {
				const ret = `${process.env.FRONTEND_URL || ''}/payment/alipay/return?orderId=${encodeURIComponent(orderId)}`;
				const url = await createPagePay({ outTradeNo, totalAmount, subject: `订单 ${orderId}`, returnUrl: ret });
				data = { paymentId, payUrl: url };
			}
		} catch (sceneError) {
			console.error('创建支付宝订单失败，尝试降级为 page:', sceneError);
			const url = await createPagePay({ outTradeNo, totalAmount, subject: `订单 ${orderId}` });
			data = { paymentId, payUrl: url, fallback: 'page' };
		}

		return res.json({ success: true, data });
	} catch (error) {
		console.error('创建支付宝订单失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

// 支付宝异步通知（x-www-form-urlencoded）
router.post('/notify', async (req: Request, res: Response) => {
    try {
        const params = req.body || {};
        // 先尝试同步验签（若 SDK 尚未初始化则返回 false），再用异步确保初始化后验签
        let ok = false;
        try {
            ok = verifyNotifySign(params);
            if (!ok) {
                ok = await verifyNotifySignAsync(params);
            }
        } catch (e) {
            ok = false;
        }

        if (!ok) return res.status(400).send('fail');

        const tradeStatus = params.trade_status as string;
        const outTradeNo = params.out_trade_no as string;
        const tradeNo = params.trade_no as string;

        // 幂等更新
        const payment = await db('payments').where({ transactionId: outTradeNo }).first();
        if (payment) {
            const newStatus = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED' ? 'success' : tradeStatus === 'WAIT_BUYER_PAY' ? 'processing' : 'failed';
            await db('payments').where({ id: payment.id }).update({
                status: newStatus,
                transactionId: tradeNo || outTradeNo,
                updatedAt: new Date(),
            });
            if (newStatus === 'success') {
                await db('orders').where({ id: payment.orderId }).update({ status: 'paid', updatedAt: new Date() });
            } else if (newStatus === 'failed') {
                await db('orders').where({ id: payment.orderId }).update({ status: 'cancelled', updatedAt: new Date() });
            }
        }

        return res.send('success');
    } catch (error) {
        console.error('处理支付宝回调失败:', error);
        // 验签/处理失败一律返回 fail，避免放行伪造或未处理完成的回调
        return res.status(400).send('fail');
    }
});

// 支付宝同步返回（可选：展示用）
router.get('/return', async (req: Request, res: Response) => {
	try {
		const params = req.query as any;
		const ok = verifyNotifySign(params);
		if (!ok) return res.status(400).send('验签失败');
		return res.send('支付结果已接收，请以订单状态为准');
	} catch (error) {
		return res.status(500).send('服务器错误');
	}
});

// 查询交易
router.get('/query/:outTradeNo', requireAuth, async (req: AuthRequest, res: Response) => {
	try {
		const { outTradeNo } = req.params as { outTradeNo: string };
		const resp = await queryTrade(outTradeNo);
		return res.json({ success: true, data: resp });
	} catch (error) {
		console.error('查询支付宝订单失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

// 主动同步订单状态：根据 orderId 找最近一次支付宝支付，查询网关并回写
router.post('/sync', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { orderId } = req.body || {};
        if (!orderId) return res.status(400).json({ success: false, error: 'orderId 为必填', code: 'VALIDATION_ERROR' });

        // 找到该订单最近一次支付宝支付
        const payment = await db('payments')
            .where({ orderId, userId: req.user!.id, method: 'alipay' })
            .orderBy('createdAt', 'desc')
            .first();
        if (!payment) return res.status(404).json({ success: false, error: '未找到支付记录', code: 'PAYMENT_NOT_FOUND' });

        const outTradeNo = payment.transactionId;
        if (!outTradeNo) return res.status(400).json({ success: false, error: '缺少交易号', code: 'MISSING_OUT_TRADE_NO' });

        const resp: any = await queryTrade(outTradeNo);
        const tradeStatus = resp?.tradeStatus || resp?.trade_status;
        let newStatus: 'processing' | 'success' | 'failed' = 'processing';
        if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') newStatus = 'success';
        else if (tradeStatus === 'WAIT_BUYER_PAY') newStatus = 'processing';
        else newStatus = 'failed';

        await db('payments').where({ id: payment.id }).update({
            status: newStatus,
            transactionId: resp?.tradeNo || resp?.trade_no || outTradeNo,
            updatedAt: new Date()
        });
		if (newStatus === 'success') {
			await db('orders').where({ id: orderId }).update({ status: 'paid', updatedAt: new Date() });
		} else if (newStatus === 'failed') {
			await db('orders').where({ id: orderId }).update({ status: 'cancelled', updatedAt: new Date() });
		}

        return res.json({ success: true, data: { tradeStatus: tradeStatus || 'UNKNOWN', paymentStatus: newStatus } });
    } catch (error) {
        console.error('主动同步支付宝订单失败:', error);
        return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
    }
});

// 退款
router.post('/refund', requireAuth, async (req: AuthRequest, res: Response) => {
	try {
		const { outTradeNo, amount, reason } = req.body || {};
		if (!outTradeNo || !amount) return res.status(400).json({ success: false, error: '参数缺失', code: 'VALIDATION_ERROR' });
		const outRequestNo = `r_${uuidv4()}`;
		const resp = await refundTrade({ outTradeNo, refundAmount: String(amount), outRequestNo, reason });
		return res.json({ success: true, data: resp });
	} catch (error) {
		console.error('支付宝退款失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

// 关单
router.post('/close', requireAuth, async (req: AuthRequest, res: Response) => {
	try {
		const { outTradeNo } = req.body || {};
		if (!outTradeNo) return res.status(400).json({ success: false, error: '参数缺失', code: 'VALIDATION_ERROR' });
		const resp = await closeTrade(outTradeNo);
		return res.json({ success: true, data: resp });
	} catch (error) {
		console.error('支付宝关单失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

export default router;
