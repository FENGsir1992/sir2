import { useParams } from "react-router-dom";
import WorkflowDetailHeader from "../components/WorkflowDetailHeader";
import VideoPreviewSection from "../components/VideoPreviewSection";
import resolveMediaUrl from "../utils/media-url";
import WorkflowListSection from "../components/WorkflowListSection";
import { useWorkflow } from "../hooks/useWorkflows";
import { WorkflowLoadingCard } from "../components/WorkflowLoadingCard";
import { WorkflowError } from "../components/WorkflowError";

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { workflow, loading, error, refresh } = useWorkflow(id || '');

  if (loading) {
    return (
      <div className="h-full bg-transparent overflow-y-auto -translate-x-[43px]">
        <WorkflowDetailHeader />
        <div className="px-6 py-4">
          <WorkflowLoadingCard />
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="h-full bg-transparent overflow-y-auto -translate-x-[43px]">
        <WorkflowDetailHeader />
        <div className="px-6 py-4">
          <WorkflowError 
            error={error || '工作流不存在'} 
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  // 转换数据格式以适配现有组件
  const workflowDetail = {
    id: workflow.id,
    title: workflow.title,
    author: workflow.author,
    authorAvatar: (resolveMediaUrl(workflow.authorAvatar || "") || workflow.authorAvatar || "/TX.jpg"),
    publishDate: new Date(workflow.publishedAt || workflow.createdAt).toLocaleString('zh-CN'),
    description: workflow.shortDescription || workflow.description,
    price: workflow.isFree ? "免费" : `¥${Number(workflow.price ?? 0).toFixed(2)}`,
    workflows: Number(workflow.workflowCount ?? 1),
    videoUrl: resolveMediaUrl(workflow.previewVideo || workflow.demoVideo || ""),
    videoDuration: "0:56", // 这个需要从视频元数据获取
    videoCurrentTime: "0:00",
    workflowId: workflow.id
  };

  // 转换工作流列表数据
  const workflowList = [
    {
      id: String(workflow.id),
      title: workflow.title,
      description: workflow.shortDescription || workflow.description,
      price: workflow.isFree ? "免费" : `¥${Number((workflow as any).price ?? 0).toFixed(2)}`,
      avatar: workflow.authorAvatar || "/TX.jpg",
      isVip: Boolean((workflow as any).isVip),
      // 把附件传递到列表组件，用于点击“立即解锁”时弹出下载器
      attachments: (workflow as any)?.attachments || []
    }
  ];

  return (
    <div className="h-full bg-transparent overflow-y-auto -translate-x-[43px]">
      {/* 模块1: 返回按钮 */}
      <WorkflowDetailHeader />

      {/* 主要内容区域 - 无边距，直接贴边 */}
      <div className="px-0">
        {/* 模块2: 视频预览区 */}
        <VideoPreviewSection workflowDetail={workflowDetail} />

        {/* 空隙分隔 */}
        <div className="h-6"></div>

        {/* 模块3: 工作流列表 */}
        <WorkflowListSection workflowList={workflowList} autoOpenDownloader={Boolean(new URLSearchParams(location.search).get('openDownloader'))} />
      </div>
    </div>
  );
}
