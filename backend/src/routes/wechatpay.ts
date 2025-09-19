import { Router, Response, Request } from 'express';
import { db } from '../database/init.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { createNativeTransaction, createH5Transaction, createJsapiTransaction, queryTransactionByOutTradeNo, closeTransactionByOutTradeNo, decryptCallbackResource, verifyCallbackSignature } from '../utils/wechatpay.js';
import fs from 'fs';
import { getWeChatPayConfig } from '../config/pay.js';
import { ensurePaymentRecord, generateOutTradeNo, mapTradeStatus } from '../utils/pay-common.js';

const router = Router();

// 创建微信Native交易并返回二维码链接
router.post('/native', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
  const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId 为必填', code: 'VALIDATION_ERROR' });
    }

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

    const { paymentId, outTradeNo } = await ensurePaymentRecord({ orderId, userId: req.user!.id, method: 'wechat', prefix: 'wx' });

    const totalFen = Math.round(Number(order.totalAmount) * 100);
    const resp = await createNativeTransaction({
      description: `订单 ${orderId}`,
      outTradeNo,
      totalAmountFen: totalFen,
      attach: { orderId, paymentId }
    });

    return res.json({ success: true, data: { paymentId, codeUrl: resp.code_url } });
  } catch (error) {
    console.error('创建微信支付失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// 微信支付回调（notify）
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
    const cfg = getWeChatPayConfig();

    let platformPublicKeyPem = '';
    if (cfg.platformCertPath && fs.existsSync(cfg.platformCertPath)) {
      platformPublicKeyPem = fs.readFileSync(cfg.platformCertPath, 'utf8');
    }
    // 回调验签策略：生产环境强制验签；非生产在有证书时验签
    const isProd = String(process.env.NODE_ENV).toLowerCase() === 'production';
    if (isProd) {
      if (!platformPublicKeyPem) {
        return res.status(500).json({ code: 'FAIL', message: 'missing platform certificate' });
      }
      const ok = verifyCallbackSignature(req.headers as any, rawBody, platformPublicKeyPem);
      if (!ok) return res.status(401).json({ code: 'FAIL', message: 'invalid signature' });
    } else if (platformPublicKeyPem) {
      const ok = verifyCallbackSignature(req.headers as any, rawBody, platformPublicKeyPem);
      if (!ok) return res.status(401).json({ code: 'FAIL', message: 'invalid signature' });
    }

    const body: any = req.body;
    if (!body || !body.resource) return res.status(400).json({ code: 'FAIL', message: 'bad payload' });

    const resource = body.resource;
    const plaintext = decryptCallbackResource(resource.associated_data || '', resource.nonce, resource.ciphertext);
    const data = JSON.parse(plaintext);

    const outTradeNo = data.out_trade_no as string;
    const tradeState = data.trade_state as string;
    const transactionId = data.transaction_id as string;
    const attachStr = data.attach as string | undefined;
    let orderId: string | undefined;
    let paymentId: string | undefined;
    try {
      if (attachStr) {
        const attachObj = JSON.parse(attachStr);
        orderId = attachObj.orderId;
        paymentId = attachObj.paymentId;
      }
    } catch {}

    // 幂等更新
    const payment = paymentId
      ? await db('payments').where({ id: paymentId }).first()
      : await db('payments').where({ transactionId: outTradeNo }).first();

    if (payment) {
      const newStatus = mapTradeStatus('wechat', tradeState);
      await db('payments').where({ id: payment.id }).update({
        status: newStatus,
        transactionId: transactionId || outTradeNo,
        updatedAt: new Date(),
      });

      if (newStatus === 'success') {
        await db('orders').where({ id: payment.orderId }).update({ status: 'paid', updatedAt: new Date() });
      } else if (newStatus === 'failed') {
        await db('orders').where({ id: payment.orderId }).update({ status: 'cancelled', updatedAt: new Date() });
      }
    }

    return res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理微信回调失败:', error);
    // 处理失败返回 FAIL，交由微信侧根据策略重试
    return res.status(500).json({ code: 'FAIL', message: 'server error' });
  }
});

// 主动同步订单状态：根据 orderId 找最近一次微信支付，查询网关并回写
router.post('/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId 为必填', code: 'VALIDATION_ERROR' });
    const payment = await db('payments')
      .where({ orderId, userId: req.user!.id, method: 'wechat' })
      .orderBy('createdAt', 'desc')
      .first();
    if (!payment) return res.status(404).json({ success: false, error: '未找到支付记录', code: 'PAYMENT_NOT_FOUND' });
    const outTradeNo = payment.transactionId;
    if (!outTradeNo) return res.status(400).json({ success: false, error: '缺少交易号', code: 'MISSING_OUT_TRADE_NO' });
    const result = await queryTransactionByOutTradeNo(outTradeNo);
    const tradeState = result?.trade_state || result?.tradeState;
    const newStatus = mapTradeStatus('wechat', tradeState || '');
    await db('payments').where({ id: payment.id }).update({ status: newStatus, updatedAt: new Date() });
    if (newStatus === 'success') {
      await db('orders').where({ id: orderId }).update({ status: 'paid', updatedAt: new Date() });
    }
    return res.json({ success: true, data: { tradeState, paymentStatus: newStatus } });
  } catch (error) {
    console.error('主动同步微信订单失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// H5 下单（适合移动端浏览器）
router.post('/h5', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId 为必填', code: 'VALIDATION_ERROR' });
    
    // 【安全修复】验证订单归属
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

    const { paymentId, outTradeNo } = await ensurePaymentRecord({ orderId, userId: req.user!.id, method: 'wechat', prefix: 'wx' });
    const totalFen = Math.round(Number(order.totalAmount) * 100);
    // 这里调用你 utils/wechatpay.js 的 H5 创建函数（若暂无，可后续接入）
    const resp: any = await createH5Transaction({
      description: `订单 ${orderId}`,
      outTradeNo,
      totalAmountFen: totalFen,
      attach: { orderId, paymentId },
      payerClientIp: req.ip || '127.0.0.1'
    });
    return res.json({ success: true, data: { paymentId, h5Url: resp.h5_url } });
  } catch (error) {
    console.error('创建微信H5支付失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// JSAPI 下单（公众号/小程序，需要 openid）
router.post('/jsapi', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, openid } = req.body || {};
    if (!orderId || !openid) return res.status(400).json({ success: false, error: 'orderId/openid 为必填', code: 'VALIDATION_ERROR' });
    
    // 【安全修复】验证订单归属
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

    const { paymentId, outTradeNo } = await ensurePaymentRecord({ orderId, userId: req.user!.id, method: 'wechat', prefix: 'wx' });
    const totalFen = Math.round(Number(order.totalAmount) * 100);
    // 这里调用你的 JSAPI 下单函数（后续接入），返回 prepay_id → 前端调起支付
    const resp: any = await createJsapiTransaction({
      description: `订单 ${orderId}`,
      outTradeNo,
      totalAmountFen: totalFen,
      openid,
      attach: { orderId, paymentId, openid }
    });
    return res.json({ success: true, data: { paymentId, prepayId: resp.prepay_id } });
  } catch (error) {
    console.error('创建微信JSAPI支付失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// 查询交易
router.get('/query/:outTradeNo', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { outTradeNo } = req.params as any;
    const resp = await queryTransactionByOutTradeNo(outTradeNo);
    return res.json({ success: true, data: resp });
  } catch (error) {
    console.error('查询微信订单失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// 关单
router.post('/close', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { outTradeNo } = req.body || {};
    if (!outTradeNo) return res.status(400).json({ success: false, error: 'outTradeNo 为必填', code: 'VALIDATION_ERROR' });
    await closeTransactionByOutTradeNo(outTradeNo);
    return res.json({ success: true });
  } catch (error) {
    console.error('关闭微信订单失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

export default router;


