import { Button, Avatar, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Icon } from "@iconify/react";
import resolveMediaUrl from "../utils/media-url";
import EditableSection from "./EditableSection";
import React from "react";
import WorkflowUsageGuide from "./WorkflowUsageGuide";
import { useNavigate, useLocation } from "react-router-dom";
import { orderApi, userApi } from "../utils/api-client";

interface WorkflowItem {
  id: string;
  title: string;
  description: string;
  price: string;
  avatar: string;
  attachments?: string[];
  isVip?: boolean; // VIP 限时免费标记（VIP免费）
}

interface WorkflowListSectionProps {
  workflowList: WorkflowItem[];
  className?: string;
  autoOpenDownloader?: boolean;
}

export default function WorkflowListSection({ workflowList, className = "", autoOpenDownloader = false }: WorkflowListSectionProps) {
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [showDownloader, setShowDownloader] = React.useState(false);
  const [selectedAttachments, setSelectedAttachments] = React.useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // 支付&解锁逻辑需要的状态
  const [isVip, setIsVip] = React.useState(false);
  const [unlockedMap, setUnlockedMap] = React.useState<Record<string, boolean>>({});

  // 初始化：查询用户是否VIP、是否已购买
  React.useEffect(() => {
    (async () => {
      try {
        // 用户资料
        const prof = await userApi.getProfile();
        if (prof?.success && prof.data) setIsVip(Boolean((prof.data as any).isVip));
      } catch {}
      try {
        const purchased = await orderApi.getPurchasedWorkflows({ page: 1, limit: 200 });
        if (purchased?.success && Array.isArray(purchased.data?.workflows)) {
          const map: Record<string, boolean> = {};
          purchased.data.workflows.forEach((w: any) => { map[String(w.id)] = true; });
          setUnlockedMap(map);
        }
      } catch {}
    })();
  }, []);

  // 若从支付回跳带 openDownloader，则自动打开
  React.useEffect(() => {
    if (autoOpenDownloader && workflowList?.[0]?.attachments?.length) {
      setSelectedAttachments(workflowList[0].attachments || []);
      setShowDownloader(true);
    }
  }, [autoOpenDownloader, workflowList]);

  // 工具：是否移动端
  const isMobile = React.useMemo(() => /Mobile|Android|iPhone/i.test(navigator.userAgent), []);
  // 支付方式选择弹窗
  const [payDialogOpen, setPayDialogOpen] = React.useState(false);
  const [pendingOrderId, setPendingOrderId] = React.useState<string>('');
  const [pendingWorkflowId, setPendingWorkflowId] = React.useState<string>('');

  async function handleUnlockOrDownload(item: WorkflowItem) {
    const files = Array.isArray(item.attachments) ? item.attachments : [];
    // VIP 用户在“VIP限时免费”的工作流下可直接下载
    const vipFree = Boolean(item.isVip) && isVip;
    const alreadyUnlocked = vipFree || isVip || unlockedMap[item.id] === true;
    if (alreadyUnlocked) {
      setSelectedAttachments(files);
      if (files.length > 0) setShowDownloader(true);
      return;
    }
    // 未解锁 -> 创建订单并发起支付
    try {
      const create = await orderApi.createOrder({ items: [{ workflowId: item.id, quantity: 1 }], paymentMethod: 'alipay' });
      if (!create?.success || !create.data?.orderId) throw new Error(create?.error || '创建订单失败');
      const orderId = create.data.orderId as string;
      setPendingOrderId(orderId);
      setPendingWorkflowId(item.id);
      setPayDialogOpen(true);
    } catch (e) {
      // 未登录则跳到登录
      const msg = (e as Error).message || '';
      if (/401|未登录|token/i.test(msg)) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }
      alert(msg || '下单失败，请稍后重试');
    }
  }
  return (
    <EditableSection page="workflow-detail" section="workflow-list">
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          {/* 标题区域 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Icon icon="lucide:list" className="text-2xl text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">工作流列表</h2>
            </div>
            <Button
              color="primary"
              variant="flat"
              startContent={<Icon icon="lucide:info" className="text-sm" />}
              size="sm"
              className="bg-blue-100 text-blue-600 hover:bg-blue-200"
              onPress={() => setGuideOpen(true)}
            >
              使用说明
            </Button>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            下载工作流压缩包并导入到 Coze 工作台即可
          </div>

          {/* VIP 升级横幅 */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon="lucide:crown" className="text-xl text-orange-800" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-900">升级SVIP，享受更多权益</h3>
                  <p className="text-xs text-orange-800">免费用户可享受基础功能，SVIP用户可免费制作更多智能体</p>
                </div>
              </div>
              <Button
                variant="flat"
                className="bg-white/10 backdrop-blur-md text-white hover:bg-white/20 font-semibold border border-white/20 shadow-lg relative overflow-hidden group"
                endContent={<Icon icon="lucide:arrow-right" className="text-sm" />}
                onPress={() => navigate("/membership")}
              >
                <span className="relative z-10">立即前往</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              </Button>
            </div>
          </div>

          {/* 工作流项目 */}
           {workflowList.map((workflow, index) => (
            <div key={workflow.id} className="bg-gray-50 rounded-lg p-4 mb-4 last:mb-0">
              {/* 顶部信息区域 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar src={resolveMediaUrl(workflow.avatar) || workflow.avatar} className="w-10 h-10 rounded-lg border border-blue-300" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold text-gray-900">{workflow.title}</span>
                      <span className="text-xs text-gray-500 break-all mt-0.5">{workflow.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md font-bold">
                    {workflow.price}
                  </div>
                  <Button
                    color="primary"
                    variant="solid"
                    startContent={<Icon icon="lucide:download" className="text-sm" />}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    size="sm"
                    onPress={() => handleUnlockOrDownload(workflow)}
                  >
                    {(isVip || unlockedMap[workflow.id]) ? '立即下载' : '立即解锁'}
                  </Button>
                </div>
              </div>

              {/* 分割线 */}
              <div className="w-full h-px bg-blue-200 mb-3"></div>

              {/* 底部信息区域 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 附件下载器 */}
      {showDownloader && (
        <Modal isOpen={showDownloader} onOpenChange={setShowDownloader} size="md">
          <ModalContent>
            <ModalHeader>工作流下载</ModalHeader>
            <ModalBody>
              <div className="space-y-3">
                {selectedAttachments.map((url, idx) => (
                  <a key={`${url}-${idx}`} href={resolveMediaUrl(url) || url} download className="flex items-center justify-between bg-gray-50 rounded border px-3 py-2 hover:bg-gray-100">
                    <span className="text-sm truncate pr-3">附件 {idx + 1}</span>
                    <Button size="sm" color="primary" variant="flat" startContent={<Icon icon="lucide:download" />}>下载</Button>
                  </a>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setShowDownloader(false)}>关闭</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* 支付方式选择弹窗 */}
      {payDialogOpen && (
        <Modal isOpen={payDialogOpen} onOpenChange={setPayDialogOpen} size="sm">
          <ModalContent>
            <ModalHeader>选择支付方式</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="h-12 bg-blue-50 text-blue-600 border border-blue-200"
                  startContent={<Icon icon="simple-icons:alipay" />}
                  onPress={() => {
                    const type = isMobile ? 'wap' : 'page';
                    const returnTo = `/workflow/${encodeURIComponent(pendingWorkflowId)}?openDownloader=1`;
                    setPayDialogOpen(false);
                    navigate(`/pay/alipay?orderId=${encodeURIComponent(pendingOrderId)}&type=${type}&workflowId=${encodeURIComponent(pendingWorkflowId)}&returnTo=${encodeURIComponent(returnTo)}`);
                  }}
                >
                  支付宝
                </Button>
                <Button
                  className="h-12 bg-green-50 text-green-600 border border-green-200"
                  startContent={<Icon icon="simple-icons:wechat" />}
                  onPress={() => {
                    setPayDialogOpen(false);
                    navigate(`/pay/wechat/native?orderId=${encodeURIComponent(pendingOrderId)}`);
                  }}
                >
                  微信
                </Button>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setPayDialogOpen(false)}>取消</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      <WorkflowUsageGuide isOpen={guideOpen} onOpenChange={setGuideOpen} />
    </EditableSection>
  );
}
