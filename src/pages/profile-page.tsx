import React from "react";
import { Button, Card, CardBody, Input, Avatar } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/AppContext";
import { userApi } from "../utils/api-client";
import { MIME_TYPES } from "../types/shared";
import { security } from "../utils/common";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  
  // 检查登录状态，未登录则重定向到登录页面
  React.useEffect(() => {
    if (!user.isLoggedIn) {
      navigate('/login');
    }
  }, [user.isLoggedIn, navigate]);

  // 昵称编辑状态
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(user.name || "");
  const [nameError, setNameError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNameInput(user.name || "");
  }, [user.name]);

  const validateName = (value: string): string | null => {
    const v = value.trim();
    if (!v) return "昵称不能为空";
    if (v.length > 20) return "昵称最多不超过20个字符";
    return null;
  };

  const onSaveName = async () => {
    // 检查登录状态
    if (!user.isLoggedIn) {
      alert('请先登录');
      navigate('/login');
      return;
    }
    
    const sanitized = security.sanitizeInput(nameInput).trim();
    const err = validateName(sanitized);
    if (err) {
      setNameError(err);
      return;
    }
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

  const onCancelName = () => {
    setIsEditingName(false);
    setNameInput(user.name || "");
    setNameError(null);
  };

  // 头像上传
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const openAvatarPicker = () => {
    // 检查登录状态
    if (!user.isLoggedIn) {
      alert('请先登录');
      navigate('/login');
      return;
    }
    avatarInputRef.current?.click();
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 检查登录状态
    if (!user.isLoggedIn) {
      alert('请先登录');
      navigate('/login');
      return;
    }
    
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选择同一文件
    if (!file) return;

    const typeCheck = security.validateFileType(file, MIME_TYPES.IMAGES as unknown as string[]);
    if (!typeCheck.isValid) {
      alert(typeCheck.message || "不支持的图片类型");
      return;
    }
    const sizeCheck = security.validateFileSize(file, 5);
    if (!sizeCheck.isValid) {
      alert(sizeCheck.message || "文件过大，最大5MB");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const resp = await userApi.updateProfile({ avatar: dataUrl });
      if (!resp.success) throw new Error(resp.error || resp.message || '更新失败');
      updateUser({ avatar: dataUrl });
    } catch (err) {
      console.error("读取文件失败", err);
      alert("读取文件失败，请重试");
    }
  };
  return (
    <div className="min-h-screen w-full relative bg-gray-50 overflow-y-auto">
      <div className="px-6 py-6">
        
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧用户信息区 */}
          <div className="col-span-12 lg:col-span-5">
            <Card className="mb-6">
              <CardBody className="p-6">
                {/* 用户头像和基本信息 */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <Avatar 
                      size="lg" 
                      className="w-16 h-16 bg-purple-500 text-white text-2xl font-bold"
                      src={user.avatar}
                      name={user.name}
                    />
                    {/* VIP / 普通标识 */}
                    <div className={`absolute -bottom-1 -right-1 text-white text-xs px-1.5 py-0.5 rounded-full ${
                      user.isVip 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' 
                        : 'bg-blue-500'
                    }`}>
                      {user.isVip ? 'SVIP用户' : '普通用户'}
                    </div>
                    {/* 更换头像按钮 - 仅在登录时显示 */}
                    {user.isLoggedIn && (
                      <button
                        type="button"
                        onClick={openAvatarPicker}
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors"
                        aria-label="更换头像"
                        title="更换头像"
                      >
                        <Icon icon="lucide:camera" className="text-gray-600 text-sm" />
                      </button>
                    )}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div className="flex-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 mb-1">
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
                        <Button size="sm" color="primary" onClick={onSaveName}>保存</Button>
                        <Button size="sm" variant="flat" onClick={onCancelName}>取消</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-semibold text-gray-800">{user.name || '未命名'}</h2>
                        {/* 编辑昵称按钮 - 仅在登录时显示 */}
                        {user.isLoggedIn && (
                          <Button size="sm" isIconOnly variant="flat" onClick={() => setIsEditingName(true)} aria-label="编辑昵称" title="编辑昵称">
                            <Icon icon="lucide:edit-2" className="text-gray-600" />
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-gray-600">ID: {user.id ? user.id.slice(0, 8) : ''}</div>
                  </div>
                </div>

                {/* 余额 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:wallet" className="text-yellow-600" />
                      <span className="text-sm text-gray-700">余额:</span>
                      <span className="text-lg font-bold text-gray-800">¥ {user.balance || 0}</span>
                    </div>
                    <Button size="sm" color="primary" variant="flat">
                      充值
                    </Button>
                  </div>
                </div>

                {/* 想了解更多计费详情 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800 mb-1">想了解更多计费详情?</div>
                      <div className="text-xs text-gray-600">查看完整的软件计费标准和你的明细</div>
                    </div>
                    <Button size="sm" color="primary">
                      查看计费标准
                    </Button>
                  </div>
                </div>

                {/* API密钥 */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="lucide:key" className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">插件API密钥 (api_token)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded px-3 py-2 text-sm font-mono text-gray-600">
                      b09efa36-8980-4
                    </div>
                    <Button size="sm" variant="flat" isIconOnly>
                      <Icon icon="lucide:copy" />
                    </Button>
                    <Button size="sm" variant="flat" isIconOnly>
                      <Icon icon="lucide:refresh-cw" />
                    </Button>
                  </div>
                </div>

                {/* 兑换礼品码 */}
                <Card className="border-2 border-dashed border-gray-300">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:gift" className="text-purple-600" />
                      </div>
                      <span className="font-medium text-gray-800">兑换礼品码 (激活码)</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="请输入兑换码"
                        className="flex-1"
                        size="sm"
                      />
                      <Button size="sm" color="primary">
                        兑换
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      输入有效的兑换码或激活码会兑换成功
                    </div>
                  </CardBody>
                </Card>
              </CardBody>
            </Card>
          </div>

          {/* 右侧SVIP推广区 */}
          <div className="col-span-12 lg:col-span-7">
            {/* SVIP会员卡片 */}
            <div className="relative bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-2xl overflow-hidden mb-6">
              {/* 右上角限时优惠标签 */}
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-bl-2xl">
                限时优惠
              </div>
              
              {/* 顶部SVIP专属标识 */}
              <div className="text-center pt-6 pb-4">
                <div className="inline-flex items-center gap-1 bg-yellow-400 text-purple-800 text-sm font-bold px-3 py-1 rounded-full">
                  <Icon icon="lucide:crown" className="text-purple-800 text-sm" />
                  SVIP专属
                </div>
              </div>

              {/* 主标题区域 */}
              <div className="text-center px-6 pb-6">
                <h2 className="text-white text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                  解锁全部高级功能 
                  <Icon icon="lucide:lock-open" className="text-white text-xl" />
                </h2>
                <p className="text-purple-100 text-sm">立即升级SVIP，畅享所有特权</p>
              </div>

              {/* 白色背景的功能特权区域 */}
              <div className="bg-white mx-4 rounded-xl p-4 mb-4">
                {/* 功能特权列表 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon icon="lucide:download" className="text-purple-600 text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm mb-1 flex items-center gap-1">
                        可下载所有SVIP免费上...
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                          热门
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">轻松下载高质量工作流资源的海量...</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon icon="lucide:calendar" className="text-purple-600 text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm mb-1">每日签到领取金币站</div>
                      <div className="text-xs text-gray-600">官方现金大礼包，每日大放送</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon icon="lucide:trending-up" className="text-purple-600 text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm mb-1">推广分成提升至50%</div>
                      <div className="text-xs text-gray-600">获得更高推广收益</div>
                    </div>
                  </div>
                </div>

                {/* 查看更多特权 */}
                <div className="text-center mb-4">
                  <Button 
                    variant="light" 
                    size="sm"
                    className="text-purple-600 hover:bg-purple-50"
                    endContent={<Icon icon="lucide:chevron-down" className="text-sm" />}
                  >
                    查看更多特权
                  </Button>
                </div>

                {/* 立即升级按钮 */}
                <div className="text-center mb-4">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold px-12 py-3 rounded-full hover:from-purple-600 hover:to-purple-700 shadow-lg"
                    endContent={<Icon icon="lucide:arrow-right" className="text-lg" />}
                  >
                    立即升级SVIP
                  </Button>
                </div>

                {/* 底部红色提示 */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-red-600">
                    <Icon icon="lucide:alert-circle" className="text-red-500" />
                    <span>免费用户功能受限，升级享受专属特权</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 更多工具 */}
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Icon icon="lucide:tool" className="text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">更多工具</h3>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-center text-gray-500 py-8">
                    更多功能正在开发中...
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
