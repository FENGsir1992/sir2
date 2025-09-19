import React from "react";
import { Card, CardBody, CardHeader, Input, Button, Link, Divider, Alert } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../utils/api-client";
import { useUser } from "../../contexts/AppContext";
import { validateEmail, validatePassword, validateUsername, sanitizeInput } from "../../utils/validation";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [formData, setFormData] = React.useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // 清理和验证输入
      const cleanUsername = sanitizeInput(formData.username);
      const cleanEmail = sanitizeInput(formData.email);
      
      // 用户名验证
      const usernameValidation = validateUsername(cleanUsername);
      if (!usernameValidation.isValid) {
        setError(usernameValidation.message || "用户名格式不正确");
        return;
      }
      
      // 邮箱验证
      const emailValidation = validateEmail(cleanEmail);
      if (!emailValidation.isValid) {
        setError(emailValidation.message || "邮箱格式不正确");
        return;
      }
      
      // 密码验证
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.message || "密码格式不正确");
        return;
      }
      
      // 确认密码验证
      if (formData.password !== formData.confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
      // 调用后端注册（由服务端安全哈希）
      const resp = await authApi.register(cleanUsername, cleanEmail, formData.password);
      if (!resp.success || !resp.data) {
        setError(resp.error || resp.message || "注册失败，请稍后再试");
        return;
      }

      // 直接登录并保存会话
      const { user, token } = resp.data;
      login({
        id: user.id,
        name: user.username,
        email: user.email,
        avatar: user.avatar,
        isVip: user.isVip,
        balance: user.balance,
        vipExpiresAt: user.vipExpiresAt,
      }, token);

      setSuccess("注册成功，已自动登录");
      setTimeout(() => navigate("/"), 600);
    } catch (err) {
      setError((err as Error).message || "注册失败，请稍后再试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-3 pb-0">
          <div className="flex items-center gap-2">
            <Icon icon="solar:user-plus-bold-duotone" className="text-2xl text-primary" />
            <h1 className="text-2xl font-bold">用户注册</h1>
          </div>
          <p className="text-gray-600">创建您的新账户</p>
        </CardHeader>
        <CardBody className="gap-4">
          {error && <Alert color="danger" title={error} />}
          {success && <Alert color="success" title={success} />}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="text"
              label="用户名"
              placeholder="请输入用户名"
              value={formData.username}
              onValueChange={(value) => setFormData({ ...formData, username: value })}
              startContent={<Icon icon="solar:user-bold-duotone" />}
              isRequired
              aria-label="用户名"
              autoComplete="username"
            />
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
              placeholder="请输入密码"
              value={formData.password}
              onValueChange={(value) => setFormData({ ...formData, password: value })}
              startContent={<Icon icon="solar:lock-password-bold-duotone" />}
              isRequired
              aria-label="密码"
              autoComplete="new-password"
            />
            <Input
              type="password"
              label="确认密码"
              placeholder="请再次输入密码"
              value={formData.confirmPassword}
              onValueChange={(value) => setFormData({ ...formData, confirmPassword: value })}
              startContent={<Icon icon="solar:lock-password-bold-duotone" />}
              isRequired
              aria-label="确认密码"
              autoComplete="new-password"
            />

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              aria-label={isLoading ? "正在注册..." : "注册"}
            >
              注册
            </Button>
          </form>

          <Divider />

          <div className="text-center">
            <span className="text-gray-600">已有账户？</span>
            <Link href="#" onClick={() => navigate("/login")} className="ml-1">
              立即登录
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
