import React from "react";
import { Card, CardBody, CardHeader, Input, Button, Link, Divider, Alert } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../utils/api-client";
import { useUser } from "../../contexts/AppContext";
import { validateEmail, sanitizeInput } from "../../utils/validation";
import WechatLoginModal from "../../components/WechatLoginModal";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wxQr, setWxQr] = React.useState<{ scene: string; imageUrl: string; expireSeconds: number } | null>(null);
  // 已移除未使用的 wxStatus 状态
  const wxTimerRef = React.useRef<number | null>(null);
  const [wechatModalOpen, setWechatModalOpen] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // 输入验证
      const cleanEmail = sanitizeInput(formData.email);
      const emailValidation = validateEmail(cleanEmail);
      
      if (!emailValidation.isValid) {
        setError(emailValidation.message || "邮箱格式不正确");
        return;
      }
      
      if (!formData.password.trim()) {
        setError("请输入密码");
        return;
      }
      
      // 调用后端API登录
      const response = await authApi.login(cleanEmail, formData.password);
      
      if (!response.success || !response.data) {
        setError(response.message || "登录失败");
        return;
      }
      
      const { user, token } = response.data;
      
      // 保存到全局状态，同时传递token
      login({ 
        id: user.id, 
        name: user.username, 
        email: user.email, 
        avatar: user.avatar,
        isVip: user.isVip,
        balance: user.balance,
        vipExpiresAt: user.vipExpiresAt
      }, token);
      
      // 确保token被保存（调试用）
      console.log('登录页面 - 用户数据:', user);
      console.log('登录页面 - Token:', token);
      console.log('登录页面 - Token已传递给AppContext');
      navigate("/");
    } catch (err) {
      setError((err as Error).message || "登录失败，请稍后再试");
    } finally {
      setIsLoading(false);
    }
  };

  const startWechatLogin = async () => {
    setError(null);
    // 初始化微信登录状态（已省略不必要的局部状态）
    try {
      const resp = await authApi.createWechatLoginQrcode();
      if (!resp.success || !resp.data) {
        setError(resp.error || resp.message || "创建二维码失败");
        return;
      }
      setWxQr(resp.data);
      // 进入轮询阶段

      if (wxTimerRef.current) window.clearInterval(wxTimerRef.current);
      const start = Date.now();
      wxTimerRef.current = window.setInterval(async () => {
        try {
          if (!resp.data?.scene) return;
          const statusResp = await authApi.getWechatLoginStatus(resp.data.scene);
          if (!statusResp.success || !statusResp.data) return;
          const { status, token, user } = statusResp.data;
          // 现在策略：已关注扫码直接授权；仅在未授权且为 scanned 时提示
          if (status === "scanned") {
            setError("已扫码。若未自动登录，请先关注公众号再返回页面");
          }
          // 超时标记（无需本地状态）
          if (status === "authorized" && token && user) {
            login({
              id: user.id,
              name: user.username,
              email: user.email,
              avatar: user.avatar,
              isVip: user.isVip,
              balance: user.balance,
              vipExpiresAt: user.vipExpiresAt,
            }, token);
            window.clearInterval(wxTimerRef.current!);
            wxTimerRef.current = null;
            navigate("/");
          }
          if (Date.now() - start > (resp.data.expireSeconds + 5) * 1000) {
            // 超时标记（无需本地状态）
            window.clearInterval(wxTimerRef.current!);
            wxTimerRef.current = null;
          }
        } catch (e) {
          // 忽略短暂网络错误，继续轮询
        }
      }, 1500);
    } catch (e) {
      setError((e as Error).message || "微信登录初始化失败");
    }
  };

  React.useEffect(() => {
    return () => {
      // 清理微信登录轮询定时器
      if (wxTimerRef.current) {
        window.clearInterval(wxTimerRef.current);
        wxTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-3 pb-0">
          <div className="flex items-center gap-2">
            <Icon icon="solar:user-bold-duotone" className="text-2xl text-primary" />
            <h1 className="text-2xl font-bold">用户登录</h1>
          </div>
          <p className="text-gray-600">欢迎回来，请登录您的账户</p>
        </CardHeader>
        <CardBody className="gap-4">
          {error && (
            <Alert color="danger" title={error} />
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="邮箱"
              placeholder="请输入您的邮箱"
              value={formData.email}
              onValueChange={(value) => setFormData({ ...formData, email: value })}
              startContent={<Icon icon="solar:letter-bold-duotone" />}
              isRequired
              aria-label="邮箱地址"
              autoComplete="email"
            />
            <Input
              type="password"
              label="密码"
              placeholder="请输入您的密码"
              value={formData.password}
              onValueChange={(value) => setFormData({ ...formData, password: value })}
              startContent={<Icon icon="solar:lock-password-bold-duotone" />}
              isRequired
              aria-label="密码"
              autoComplete="current-password"
            />

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  className="rounded" 
                  aria-label="记住登录状态"
                />
                <span className="text-sm">记住我</span>
              </label>
              <Link 
                href="#" 
                size="sm"
                aria-label="找回密码"
              >
                忘记密码？
              </Link>
            </div>

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              aria-label={isLoading ? "正在登录..." : "登录"}
            >
              登录
            </Button>
          </form>

          <Divider />

          <div className="flex flex-col gap-4 items-center">
            <Button 
              color="success" 
              variant="flat" 
              onClick={() => {
                setWechatModalOpen(true);
                if (!wxQr) {
                  startWechatLogin();
                }
              }} 
              aria-label="微信扫码登录"
              className="w-full"
            >
              <Icon icon="ri:wechat-fill" className="mr-2" /> 微信扫码登录
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* 微信登录弹窗 */}
      <WechatLoginModal
        isOpen={wechatModalOpen}
        onOpenChange={setWechatModalOpen}
        qrCodeUrl={wxQr?.imageUrl}
        onConfirmJoined={() => {
          setWechatModalOpen(false);
          // 这里可以添加加群成功后的逻辑
        }}
      />
    </div>
  );
}
