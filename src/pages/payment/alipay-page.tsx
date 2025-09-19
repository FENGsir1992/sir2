import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentApi } from "../../utils/api-client";

export default function AlipayPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('orderId') || '';
  const type = (params.get('type') || 'page').toLowerCase() as 'page' | 'wap' | 'qr';

  const [qrCode, setQrCode] = React.useState<string>('');
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
        const resp = await paymentApi.createAlipay(orderId, type);
        if (!resp.success || !resp.data) {
          setError(resp.error || resp.message || '创建支付宝支付失败');
          return;
        }
        setPaymentId((resp.data as any).paymentId);

        if (type === 'qr' && (resp.data as any).qrCode) {
          setQrCode((resp.data as any).qrCode);
        } else if ((resp.data as any).payUrl) {
          window.location.href = (resp.data as any).payUrl as string;
          return;
        } else {
          setError('返回数据缺少 payUrl/qrCode');
          return;
        }

        const start = Date.now();
        timerRef.current = window.setInterval(async () => {
          try {
            const id = paymentId || (resp.data as any).paymentId;
            if (!id) return;
            const st = await paymentApi.getPaymentStatus(id);
            if (st.success && st.data?.status === 'success') {
              window.clearInterval(timerRef.current!);
              timerRef.current = null;
              // 支付成功后跳转到工作流商店的“我的购买记录”页签
              navigate('/store?tab=orders');
            }
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
  }, [orderId, type]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-2xl font-bold">支付宝支付</h1>
      {error && <div className="text-red-600">{error}</div>}
      {!error && type !== 'qr' && <div>正在跳转至支付宝...</div>}
      {!error && type === 'qr' && !qrCode && <div>正在创建支付...</div>}
      {!error && type === 'qr' && qrCode && (
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`}
          alt="支付宝二维码"
          className="border rounded p-2 bg-white"
        />
      )}
      <div className="text-gray-500 text-sm">请使用支付宝完成支付</div>
    </div>
  );
}


