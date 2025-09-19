import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import { closeTrade as alipayCloseTrade } from './alipay.js';
import { closeTransactionByOutTradeNo as wechatCloseByOutTradeNo } from './wechatpay.js';

// 生成规范的 outTradeNo（去掉连字符，限制长度，兼容微信32位上限）
export function generateOutTradeNo(
  prefix: string,
  orderId: string,
  paymentId?: string,
  maxLen: number = 64
): string {
  const compact = (s: string) => String(s || '').replace(/-/g, '');
  const pid = compact(paymentId || uuidv4()); // 32 hex chars

  // 微信要求 <=32 字节，优先保证唯一性：使用 prefix + uuid 截断
  if (maxLen <= 32) {
    return (prefix + pid).slice(0, maxLen);
  }

  // 其他平台：保留部分 orderId 便于排查，同时附带 uuid，提高唯一性
  const candidate = `${prefix}${compact(orderId).slice(0,16)}${pid.slice(0,32)}`;
  return candidate.slice(0, maxLen);
}

// 确保 payments 记录存在并处于 processing，返回 { paymentId, outTradeNo }
export async function ensurePaymentRecord(params: {
  orderId: string;
  userId: string;
  method: 'alipay' | 'wechat' | 'balance';
  prefix?: string; // 交易号前缀
}): Promise<{ paymentId: string; outTradeNo: string }>{
  const { orderId, userId, method, prefix = method === 'alipay' ? 'ali' : method === 'wechat' ? 'wx' : 'pay' } = params;
  const existingPayment = await db('payments')
    .where({ orderId, userId, method })
    .orderBy('createdAt', 'desc')
    .first();

  const paymentId = existingPayment?.id || uuidv4();
  const maxLen = method === 'wechat' ? 32 : 64;
  let outTradeNo = existingPayment?.transactionId || generateOutTradeNo(prefix, orderId, paymentId, maxLen);
  // 若已有交易号长度超过平台上限，重新生成
  if (!outTradeNo || outTradeNo.length > maxLen) {
    outTradeNo = generateOutTradeNo(prefix, orderId, paymentId, maxLen);
  }

  if (!existingPayment) {
    const order = await db('orders').where({ id: orderId, userId }).first();
    const amount = order?.totalAmount || 0;
    await db('payments').insert({
      id: paymentId,
      orderId,
      userId,
      amount,
      method,
      status: 'processing',
      transactionId: outTradeNo,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db('payments').where({ id: paymentId }).update({ status: 'processing', transactionId: outTradeNo, updatedAt: new Date() });
  }

  return { paymentId, outTradeNo };
}

// 平台状态到内部状态映射
export function mapTradeStatus(platform: 'alipay' | 'wechat', status: string): 'processing' | 'success' | 'failed' {
  if (platform === 'alipay') {
    if (status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED') return 'success';
    if (status === 'WAIT_BUYER_PAY') return 'processing';
    return 'failed';
  }
  // wechat
  if (status === 'SUCCESS') return 'success';
  if (status === 'USERPAYING' || status === 'NOTPAY') return 'processing';
  return 'failed';
}

// 回填支付与订单状态（幂等）
export async function updateOrderAndPayment(params: {
  transactionId: string | undefined;
  outTradeNo: string;
  platform: 'alipay' | 'wechat';
}): Promise<'processing' | 'success' | 'failed' | null> {
  const { transactionId, outTradeNo } = params;
  const payment = await db('payments').where({ transactionId: outTradeNo }).first();
  if (!payment) return null;
  const newStatus = payment.status as 'processing' | 'success' | 'failed';
  await db('payments').where({ id: payment.id }).update({ transactionId: transactionId || outTradeNo, updatedAt: new Date() });
  if (newStatus === 'success') {
    await db('orders').where({ id: payment.orderId }).update({ status: 'paid', updatedAt: new Date() });
  } else if (newStatus === 'failed') {
    await db('orders').where({ id: payment.orderId }).update({ status: 'cancelled', updatedAt: new Date() });
  }
  return newStatus;
}

// 关闭超时未支付订单及其平台交易（如果存在）
export async function closeOverdueOrders(params: {
  olderThanMs: number;
  limit?: number;
}): Promise<{ closedOrders: number; affectedPayments: number }> {
  const { olderThanMs, limit = 100 } = params;
  const deadline = new Date(Date.now() - olderThanMs);

  // 找到超时的 pending 或 processing 订单
  const overdueOrders = await db('orders')
    .whereIn('status', ['pending', 'processing'])
    .andWhere('createdAt', '<', deadline)
    .limit(limit);

  let closedOrders = 0;
  let affectedPayments = 0;

  for (const order of overdueOrders) {
    try {
      const payments = await db('payments')
        .where({ orderId: order.id })
        .andWhere((qb: any) => qb.where('status', 'processing').orWhere('status', 'failed'))
        .orderBy('createdAt', 'desc');

      for (const p of payments) {
        const outTradeNo = p.transactionId as string | undefined;
        if (!outTradeNo) continue;
        try {
          if (p.method === 'alipay') {
            await alipayCloseTrade(outTradeNo);
            affectedPayments++;
          } else if (p.method === 'wechat') {
            await wechatCloseByOutTradeNo(outTradeNo);
            affectedPayments++;
          }
        } catch (e) {
          // 忽略单笔关单失败，继续
        }
      }

      await db('orders').where({ id: order.id }).update({ status: 'cancelled', updatedAt: new Date() });
      closedOrders++;
    } catch (e) {
      // 单个订单失败不影响其它
    }
  }

  return { closedOrders, affectedPayments };
}


