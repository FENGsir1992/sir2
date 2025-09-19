import React from "react";
import { 
  Card, 
  CardBody, 
  Input, 
  Select, 
  SelectItem, 
  Button, 
  Checkbox,
  Progress,
  Divider
} from "@heroui/react";
import { Icon } from "@iconify/react";

export const MigrationForm: React.FC = () => {
  const [sourceType, setSourceType] = React.useState<string>("langflow");
  const [targetType, setTargetType] = React.useState<string>("flowise");
  const [apiKey, setApiKey] = React.useState<string>("");
  const [workflowId, setWorkflowId] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<number>(0);
  const [showProgress, setShowProgress] = React.useState<boolean>(false);
  
  const handleSourceChange = (value: React.Key) => {
    setSourceType(value as string);
  };
  
  const handleTargetChange = (value: React.Key) => {
    setTargetType(value as string);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowProgress(true);
    
    // Simulate progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsLoading(false);
        setTimeout(() => {
          setShowProgress(false);
          setProgress(0);
        }, 1000);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold">工作流迁移工具</h3>
        <p className="text-gray-600 mt-1">
          将您的工作流从一个平台迁移到另一个平台，保持所有节点和连接。
        </p>
      </div>
      
      <Divider />
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Platform */}
          <Card>
            <CardBody className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary-100 p-2 rounded-md">
                    <Icon icon="lucide:box" className="text-primary text-xl" />
                  </div>
                  <h4 className="font-medium">源平台</h4>
                </div>
                
                <Select 
                  label="选择源平台" 
                  placeholder="选择源平台"
                  selectedKeys={[sourceType]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) handleSourceChange(selected);
                  }}
                  className="w-full"
                >
                   <SelectItem key="langflow">Langflow</SelectItem>
                   <SelectItem key="flowise">Flowise</SelectItem>
                   <SelectItem key="logseq">Logseq</SelectItem>
                </Select>
                
                <Input
                  label="API 密钥"
                  placeholder="输入源平台 API 密钥"
                  value={apiKey}
                  onValueChange={setApiKey}
                  type="password"
                />
                
                <Input
                  label="工作流 ID"
                  placeholder="输入工作流 ID"
                  value={workflowId}
                  onValueChange={setWorkflowId}
                />
              </div>
            </CardBody>
          </Card>
          
          {/* Target Platform */}
          <Card>
            <CardBody className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-success-100 p-2 rounded-md">
                    <Icon icon="lucide:target" className="text-success text-xl" />
                  </div>
                  <h4 className="font-medium">目标平台</h4>
                </div>
                
                <Select 
                  label="选择目标平台" 
                  placeholder="选择目标平台"
                  selectedKeys={[targetType]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) handleTargetChange(selected);
                  }}
                  className="w-full"
                >
                   <SelectItem key="langflow">Langflow</SelectItem>
                   <SelectItem key="flowise">Flowise</SelectItem>
                   <SelectItem key="logseq">Logseq</SelectItem>
                </Select>
                
                <Input
                  label="API 密钥"
                  placeholder="输入目标平台 API 密钥"
                  type="password"
                />
                
                <Input
                  label="工作流名称"
                  placeholder="输入新工作流名称"
                />
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* Options */}
        <Card>
          <CardBody className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-warning-100 p-2 rounded-md">
                  <Icon icon="lucide:settings" className="text-warning text-xl" />
                </div>
                <h4 className="font-medium">迁移选项</h4>
              </div>
              
              <div className="flex flex-col gap-2">
                <Checkbox defaultSelected>保留原始节点 ID</Checkbox>
                <Checkbox defaultSelected>迁移所有连接</Checkbox>
                <Checkbox>迁移后自动运行工作流</Checkbox>
                <Checkbox>创建迁移报告</Checkbox>
              </div>
            </div>
          </CardBody>
        </Card>
        
        {/* Progress */}
        {showProgress && (
          <Card>
            <CardBody className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary-100 p-2 rounded-md">
                    <Icon icon="lucide:loader" className="text-primary text-xl" />
                  </div>
                  <h4 className="font-medium">迁移进度</h4>
                </div>
                
                <Progress
                  aria-label="Migration progress"
                  value={progress}
                  color="primary"
                  showValueLabel
                  className="max-w-md"
                />
                
                <p className="text-sm text-gray-600">
                  {progress < 100 ? "正在迁移工作流..." : "迁移完成！"}
                </p>
              </div>
            </CardBody>
          </Card>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            color="primary" 
            size="lg"
            isLoading={isLoading}
            startContent={!isLoading && <Icon icon="lucide:arrow-right" />}
          >
            开始迁移
          </Button>
        </div>
      </form>
    </div>
  );
};