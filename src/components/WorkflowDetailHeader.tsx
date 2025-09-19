import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import EditableSection from "./EditableSection";

interface WorkflowDetailHeaderProps {
  className?: string;
}

export default function WorkflowDetailHeader({ className = "" }: WorkflowDetailHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <EditableSection page="workflow-detail" section="header">
      <div className={`px-0 py-4 ${className}`}>
        <Button
          variant="flat"
          startContent={<Icon icon="lucide:arrow-left" className="text-lg" />}
          onPress={handleBack}
          className="bg-white/10 backdrop-blur-md text-gray-700 hover:bg-white/20 border border-white/20 shadow-lg"
        >
          返回列表
        </Button>
      </div>
    </EditableSection>
  );
}
