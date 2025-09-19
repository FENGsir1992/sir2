import { Modal, ModalContent, ModalBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

interface WechatLoginModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  qrCodeUrl?: string;
  onConfirmJoined?: () => void;
}

export default function WechatLoginModal({ 
  isOpen, 
  onOpenChange, 
  qrCodeUrl,
  onConfirmJoined 
}: WechatLoginModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange} 
      size="md" 
      backdrop="blur"
      classNames={{
        base: "bg-transparent",
        wrapper: "flex items-center justify-center",
      }}
      hideCloseButton
    >
      <ModalContent className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white relative overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="关闭"
        >
          <Icon icon="lucide:x" className="text-white text-lg" />
        </button>

        {/* 装饰性圆点 */}
        <div className="absolute top-6 left-6 w-2 h-2 bg-white/30 rounded-full"></div>
        <div className="absolute bottom-20 right-8 w-1.5 h-1.5 bg-white/20 rounded-full"></div>
        <div className="absolute top-1/3 right-12 w-1 h-1 bg-white/25 rounded-full"></div>

        <ModalBody className="p-8">
          {/* 标题区域 */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">官方交流群</h2>
            <p className="text-purple-100 text-sm">与AI爱好者一起探索AIGC前沿技术</p>
          </div>

          {/* 功能按钮组 */}
          <div className="flex justify-center gap-3 mb-8">
            <div className="bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="text-white text-sm font-medium">免费学习资料</span>
            </div>
            <div className="bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="text-white text-sm font-medium">专业技术答疑</span>
            </div>
            <div className="bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="text-white text-sm font-medium">热门案例分享</span>
            </div>
          </div>

          {/* 二维码区域 */}
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="微信登录二维码" 
                  className="w-40 h-40 object-contain"
                />
              ) : (
                <div className="w-40 h-40 bg-gray-100 rounded-xl flex flex-col items-center justify-center">
                  <Icon icon="simple-icons:wechat" className="text-green-500 text-4xl mb-2" />
                  <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-500 text-center">二维码加载中...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 扫码提示（已关注扫码可直接登录；新用户需关注后登录） */}
          <div className="flex flex-col items-center justify-center mb-6 gap-2">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <Icon icon="simple-icons:wechat" className="text-green-400 text-lg" />
              <span className="text-white text-sm font-medium">已关注用户：扫码后自动登录</span>
            </div>
            <span className="text-white/80 text-xs">新用户：请先关注公众号，返回本页将自动登录</span>
          </div>

          {/* 确认按钮 */}
          <div className="flex justify-center">
            <Button
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm px-8 py-2 rounded-full font-medium transition-all duration-200 hover:scale-105"
              variant="bordered"
              onPress={onConfirmJoined}
            >
              我已加入官方群
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
