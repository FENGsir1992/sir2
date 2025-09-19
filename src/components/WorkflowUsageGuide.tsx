import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

interface WorkflowUsageGuideProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function WorkflowUsageGuide({ isOpen, onOpenChange }: WorkflowUsageGuideProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Icon icon="lucide:rocket" className="text-purple-600" />
          工作流使用指南
        </ModalHeader>
        <ModalBody>
          {/* Step 1 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
              <div className="text-lg font-semibold">下载工作流</div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              点击工作流卡片中的“下载压缩包”按钮，系统将自动下载包含工作流配置的 ZIP 文件到您的设备。
            </p>
            <div className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400">
              图片占位（下载工作流）
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
              <div className="text-lg font-semibold">导入到 Coze</div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              解压下载的 ZIP 文件，然后在 Coze 工作台中选择“导入工作流”，上传解压后的配置文件即可完成导入。
            </p>
            <div className="w-full h-56 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400">
              图片占位（导入到 Coze）
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
              <div className="text-lg font-semibold">开始使用</div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              导入成功后，您可以在 Coze 平台中运行、编辑和自定义这些工作流，创建属于您的 AI 应用。
            </p>
            <div className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400">
              图片占位（开始使用）
            </div>
          </div>

          {/* Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800 text-sm">
            <div className="flex items-start gap-2">
              <Icon icon="lucide:alert-circle" className="mt-0.5" />
              <p>
                重要提示：使用前请确保您已解锁相应的智能体，未解锁的智能体无法下载工作流文件。
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={() => onOpenChange(false)} startContent={<Icon icon="lucide:check-circle" />}>我已了解</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


