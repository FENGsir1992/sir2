import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { orderApi } from "../../utils/api-client";

export default function AlipayResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('orderId') || '';

  const [status, setStatus] = React.useState<'checking' | 'success' | 'processing' | 'failed'>('checking');
  const [message, setMessage] = React.useState<string>('正在确认支付结果…');

  React.useEffect(() => {
    let timer: number | null = null;
    (async () => {
      try {
        if (!orderId) {
          setStatus('failed');
          setMessage('缺少订单ID');
          return;
        }
        // 先查订单状态
        const o = await orderApi.getOrder(orderId);
        if (o?.success && o.data?.status === 'paid') {
          setStatus('success');
          setMessage('支付成功');
          return;
        }

        // 未更新时，尝试主动同步
        try {
          await fetch(`/api/pay/alipay/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
          });
        } catch {}

        const start = Date.now();
        timer = window.setInterval(async () => {
          const oo = await orderApi.getOrder(orderId);
          if (oo?.success && oo.data?.status === 'paid') {
            if (timer) window.clearInterval(timer);
            setStatus('success');
            setMessage('支付成功');
          } else if (Date.now() - start > 120000) { // 2分钟
            if (timer) window.clearInterval(timer);
            setStatus('processing');
            setMessage('正在确认支付结果，稍后可在订单页查看');
          }
        }, 1500);
      } catch (e) {
        setStatus('failed');
        setMessage((e as Error).message);
      }
    })();

    return () => { if (timer) window.clearInterval(timer); };
  }, [orderId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-2xl font-bold">支付结果</h1>
      <div className="text-gray-700">{message}</div>
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => navigate('/store?tab=orders')}>查看购买记录</button>
        <button className="px-4 py-2 rounded bg-gray-200" onClick={() => navigate('/')}>返回首页</button>
      </div>
      {status === 'processing' && <div className="text-orange-600">稍后可在订单页刷新查看</div>}
      {status === 'failed' && <div className="text-red-600">校验失败，请稍后重试或联系支持</div>}
    </div>
  );
}


