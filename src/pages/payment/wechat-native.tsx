import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentApi } from "../../utils/api-client";

export default function WechatNativePayPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('orderId') || '';

  const [codeUrl, setCodeUrl] = React.useState<string>('');
  const [paymentId, setPaymentId] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        if (!orderId) {
          setError('缺少订单ID');
          return;
        }
        const resp = await paymentApi.createWechatNative(orderId);
        if (!resp.success || !resp.data) {
          setError(resp.error || resp.message || '创建微信支付失败');
          return;
        }
        setCodeUrl(resp.data.codeUrl);
        setPaymentId(resp.data.paymentId);

        // 轮询支付状态
        const start = Date.now();
        timerRef.current = window.setInterval(async () => {
          try {
            if (!paymentId && !resp.data?.paymentId) return;
            const id = paymentId || resp.data?.paymentId;
            if (!id) return;
            const st = await paymentApi.getPaymentStatus(id);
            if (st.success && st.data?.status === 'success') {
              window.clearInterval(timerRef.current!);
              timerRef.current = null;
              // 支付成功后跳转到工作流商店的“我的购买记录”页签
              navigate('/store?tab=orders');
            }
            // 最长轮询5分钟
            if (Date.now() - start > 5 * 60 * 1000) {
              window.clearInterval(timerRef.current!);
              timerRef.current = null;
            }
          } catch {}
        }, 1500);
      } catch (e) {
        setError((e as Error).message);
      }
    })();

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [orderId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-2xl font-bold">微信扫码支付</h1>
      {error && <div className="text-red-600">{error}</div>}
      {!error && !codeUrl && <div>正在创建支付...</div>}
      {!error && codeUrl && (
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(codeUrl)}`}
          alt="微信支付二维码"
          className="border rounded p-2 bg-white"
        />
      )}
      <div className="text-gray-500 text-sm">请使用微信扫一扫完成支付</div>
    </div>
  );
}


