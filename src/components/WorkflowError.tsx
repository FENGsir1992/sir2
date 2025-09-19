import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

interface WorkflowErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function WorkflowError({ error, onRetry, className = "" }: WorkflowErrorProps) {
  return (
    <div className={`bg-white rounded-lg border-2 border-dashed border-red-200 p-8 ${className}`}>
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Icon icon="lucide:alert-circle" className="text-red-500 text-xl" />
        </div>
        <h3 className="text/base font-medium text-gray-900 mb-2">加载失败</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        {onRetry && (
          <Button
            color="primary"
            variant="flat"
            startContent={<Icon icon="lucide:refresh-cw" className="text-sm" />}
            onPress={onRetry}
            className="bg-red-100 text-red-600 hover:bg-red-200"
          >
            重试
          </Button>
        )}
      </div>
    </div>
  );
}


