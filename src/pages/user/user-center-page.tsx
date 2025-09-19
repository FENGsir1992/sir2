import { useState, useRef, useEffect } from "react";
import { Card, Button, Avatar, Input, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/AppContext";
import { MIME_TYPES } from "../../types/shared";
import { security } from "../../utils/common";
import { userApi } from "../../utils/api-client";

export default function UserCenterPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useUser();
  const [redeemCode, setRedeemCode] = useState("");
  
  // 检查登录状态，未登录则重定向到登录页面
  useEffect(() => {
    if (!user.isLoggedIn) {
      navigate('/login');
    }
  }, [user.isLoggedIn, navigate]);
  
  // 昵称编辑
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.name || "");
  const [nameError, setNameError] = useState<string | null>(null);
  useEffect(() => { setNameInput(user.name || ""); }, [user.name]);
  const validateName = (value: string): string | null => {
    const v = value.trim();
    if (!v) return "昵称不能为空";
    if (v.length > 20) return "昵称最多不超过20个字符";
    return null;
  };
  const saveName = async () => {
    // 检查登录状态
    if (!user.isLoggedIn) {
      alert('请先登录');
      navigate('/login');
      return;
    }
    
    const sanitized = security.sanitizeInput(nameInput).trim();
    const err = validateName(sanitized);
    if (err) { setNameError(err); return; }
    try {
      const resp = await userApi.updateProfile({ username: sanitized });
      if (!resp.success) throw new Error(resp.error || resp.message || '更新失败');
      updateUser({ name: sanitized });
    } catch (e) {
      alert('更新昵称失败，请稍后再试');
      return;
    }
    setIsEditingName(false);
    setNameError(null);
  };
  const cancelName = () => {
    setIsEditingName(false);
    setNameInput(user.name || "");
    setNameError(null);
  };

  // 头像上传
  const fileRef = useRef<HTMLInputElement>(null);
  const triggerPick = () => {
    // 检查登录状态
    if (!user.isLoggedIn) {
      alert('请先登录');
      navigate('/login');
      return;
    }
    fileRef.current?.click();
  };
  const readAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 检查登录状态
    if (!user.isLoggedIn) {
      alert('请先登录');
      navigate('/login');
      return;
    }
    
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const typeCheck = security.validateFileType(file, MIME_TYPES.IMAGES as unknown as string[]);
    if (!typeCheck.isValid) { alert(typeCheck.message || "不支持的图片类型"); return; }
    const sizeCheck = security.validateFileSize(file, 5);
    if (!sizeCheck.isValid) { alert(sizeCheck.message || "文件过大，最大5MB"); return; }
    try {
      const dataUrl = await readAsDataUrl(file);
      const resp = await userApi.updateProfile({ avatar: dataUrl });
      if (!resp.success) throw new Error(resp.error || resp.message || '更新失败');
      updateUser({ avatar: dataUrl });
    } catch (err) {
      console.error("读取文件失败", err);
      alert("读取文件失败，请重试");
    }
  };
  
  return (
    <div className="min-h-screen bg-transparent px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-7xl pl-[14px] pr-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <Card className="p-6">
              <div className="flex items-start gap-5 mb-6">
                <div className="relative flex flex-col items-start">
                  <div className="relative w-14">
                    <Avatar
                      src={user.avatar}
                      className="w-14 h-14"
                      name={user.name}
                    />
                    {/* 更换头像 - 固定在头像右下角 */}
                    {user.isLoggedIn && (
                      <button
                        type="button"
                        onClick={triggerPick}
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors"
                        aria-label="更换头像"
                        title="更换头像"
                      >
                        <Icon icon="lucide:camera" className="text-gray-600 text-xs" />
                      </button>
                    )}
                  </div>
                  {/* 去除头像右上角皇冠 */}
                  {user.isVip && (
                    <div className="mt-3 w-14 flex justify-start">
                      <Chip 
                        size="sm"
                        variant="bordered"
                        className="inline-flex items-center justify-center h-6 min-h-6 px-2 text-xs leading-none border border-amber-400 text-amber-600 bg-amber-50/50 rounded-md font-medium shadow-sm"
                      >
SVIP用户
                      </Chip>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                </div>
                <div className="ml-5">
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <>
                        <Input
                          size="sm"
                          value={nameInput}
                          onChange={(e) => { setNameInput(e.target.value); setNameError(null); }}
                          maxLength={20}
                          isInvalid={!!nameError}
                          errorMessage={nameError || undefined}
                          description={`${nameInput.length}/20`}
                          placeholder="请输入昵称（最多20个字符）"
                          className="max-w-xs"
                        />
                        <Button size="sm" color="primary" onClick={saveName}>保存</Button>
                        <Button size="sm" variant="flat" onClick={cancelName}>取消</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-4 flex items-center justify-center">
                            <Icon icon="solar:user-bold" className="text-gray-400 text-sm" />
                          </span>
                          <span className="text-sm text-gray-500">昵称：</span>
                          <span className="text-base text-gray-800 font-medium">{user.name || '未命名'}</span>
                        </div>
                        {/* 编辑昵称按钮 - 仅在登录时显示 */}
                        {user.isLoggedIn && (
                          <Button 
                            size="sm" 
                            isIconOnly 
                            variant="flat" 
                            className="h-6 w-6 min-w-6 p-0"
                            onClick={() => setIsEditingName(true)} 
                            aria-label="编辑昵称" 
                            title="编辑昵称"
                          >
                            <Icon icon="lucide:edit-2" className="text-gray-600 text-xs" />
                          </Button>
                        )}
                        {/* VIP 标识已移动到头像下方 */}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="w-4 flex items-center justify-center">
                      <Icon icon="solar:wallet-bold-duotone" className="text-yellow-500 text-sm" />
                    </span>
                    <span className="text-sm text-gray-600">余额：￥{user.balance || 0}</span>
                    <Button size="sm" variant="light" className="text-blue-600 border-[0.25px] border-gray-400/50 rounded-md h-5 px-1.5 py-0 text-xs" onClick={() => navigate("/membership")}>
                      充值
                    </Button>
                  </div>
                  {/* 将 ID 行移动到余额下方 */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                    <span className="w-4 flex items-center justify-center">
                      <Icon icon="solar:user-id-bold" className="text-gray-400 text-sm" />
                    </span>
                    <span>ID：{user.id.slice(0, 8)}</span>
                    <Icon icon="solar:copy-bold" className="text-blue-500 cursor-pointer hover:text-blue-600 transition-colors" />
                    <Button size="sm" variant="flat" className="text-red-600 px-2 py-1 h-7 text-xs ml-auto" onClick={logout}>
                      退出登录
                    </Button>
                  </div>
                </div>
              </div>

            </Card>

            

            {/* API Token */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="solar:key-bold-duotone" className="text-gray-600" />
                <span className="font-medium">插件API秘钥</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-100 px-3 py-2 rounded flex-1">
                  b09efa36-8980-4
                </code>
                <Icon icon="solar:copy-bold" className="text-blue-500 cursor-pointer" />
                <Icon icon="solar:refresh-bold" className="text-gray-500 cursor-pointer" />
              </div>
            </Card>

            {/* 消费与计费模块 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-3 border border-gray-200 hover:shadow-md transition-shadow min-h-[64px]">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-800">消费明细</div>
                    </div>
                    <Button size="sm" variant="flat" className="text-red-600 px-2 py-1 h-7 text-xs">查看</Button>
                  </div>
                  <div className="text-[11px] text-gray-500">查看消费记录与流水</div>
                </div>
              </Card>

              <Card className="p-3 border border-gray-200 hover:shadow-md transition-shadow min-h-[64px]">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-800">计费详情</div>
                    </div>
                    <Button size="sm" variant="flat" className="text-rose-600 px-2 py-1 h-7 text-xs">查看</Button>
                  </div>
                  <div className="text-[11px] text-gray-500">计费标准与价格说明</div>
                </div>
              </Card>
            </div>

            {/* Redemption Code */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Icon icon="solar:gift-bold-duotone" className="text-pink-600 text-lg" />
                </div>
                <span className="font-semibold">兑换礼品码（激活码）</span>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="请输入兑换码"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="w-full"
                />
                <Button color="primary" size="sm" className="w-full">
                  兑换
                </Button>
                <p className="text-xs text-gray-500">
                  输入有效的兑换码后点击兑换会员兑换券
                </p>
              </div>
            </Card>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* VIP Section (1:1 复刻竞品样式) */}
            <div className="relative">
              {/* 右上角斜角限时标签 */}
              <div className="pointer-events-none absolute -top-3 -right-14 rotate-45 z-20">
                <div className="bg-rose-500 text-white text-[12px] font-bold tracking-wider px-14 py-1 shadow-md">
                  限时特惠
                </div>
              </div>
              <Card className="relative overflow-hidden p-0 rounded-2xl">
                {/* Header：仅在黑框区域内渲染背景 */}
                <div className="relative p-8 text-white rounded-t-2xl bg-gradient-to-r from-[#7C4DFF] via-[#7C4DFF] to-[#6A62F9]">
                  {/* 背景点阵（限制在头部内） */}
                  <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0",
                  }}></div>

                  <div className="relative z-10">
                    {/* 顶部徽标行 */}
                    <div className="flex items-center gap-2 mb-5">
                      <Icon icon="solar:crown-bold" className="text-yellow-300 text-xl" />
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">SVIP专属</span>
                    </div>

                    {/* 标题与副标题 */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">解锁全部高级功能</h2>
                        <Icon icon="lucide:lock" className="text-white/90" />
                      </div>
                      <p className="text-purple-100 mt-1">立即升级SVIP，畅享所有特权</p>
                    </div>
                  </div>
                </div>

                {/* Content：黑框外区域，背景不再填充 */}
                <div className="px-8 pb-8 pt-4">
                  {/* 三列权益 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl bg-purple-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="solar:download-bold" className="text-purple-500" />
                        <span className="text-sm font-medium text-gray-800">可下载所有SVIP免费工具</span>
                        <span className="ml-auto bg-red-500 text-white text-[10px] leading-5 px-2 rounded">新功能</span>
                      </div>
                      <p className="text-xs text-gray-600">轻松下载高质量工具系列的新...</p>
                    </div>

                    <div className="rounded-xl bg-purple-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="solar:calendar-bold" className="text-purple-500" />
                        <span className="text-sm font-medium text-gray-800">每日签到领现金津贴</span>
                      </div>
                      <p className="text-xs text-gray-600">官方现金全大礼包·每日大放送</p>
                    </div>

                    <div className="rounded-xl bg-purple-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon icon="solar:users-group-rounded-bold" className="text-purple-500" />
                        <span className="text-sm font-medium text-gray-800">推广分成提升至50%</span>
                      </div>
                      <p className="text-xs text-gray-600">获得更高的推广收益</p>
                    </div>
                  </div>

                  {/* 查看更多特权 */}
                  <div className="text-center mb-4">
                    <Button variant="light" className="text-purple-600 hover:text-purple-700"
                      endContent={<Icon icon="solar:alt-arrow-down-bold" />}
                    >
                      查看更多特权
                    </Button>
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full bg-white text-purple-700 font-semibold py-3 text-base hover:bg-white/90"
                    endContent={<Icon icon="solar:arrow-right-bold" />}
                    onClick={() => navigate("/membership")}
                  >
                    立即升级SVIP
                  </Button>

                  {/* 底部提示 */}
                  <div className="flex items-center justify-center gap-2 mt-4 text-sm">
                    <Icon icon="solar:danger-circle-bold" className="text-red-500" />
                    <span className="text-red-600">免费用户功能受限，升级享受全部特权</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Tools Section */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Icon icon="solar:widget-4-bold" className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">更多工具</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon icon="solar:document-text-bold-duotone" className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">文档工具</h4>
                      <p className="text-sm text-gray-600">处理各种文档格式</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icon icon="solar:gallery-bold-duotone" className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">图片工具</h4>
                      <p className="text-sm text-gray-600">图片编辑和处理</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Icon icon="solar:code-bold-duotone" className="text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">开发工具</h4>
                      <p className="text-sm text-gray-600">代码和开发辅助</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}