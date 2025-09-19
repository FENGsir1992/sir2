import React from "react";
import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import EditableSection from "./EditableSection";
import resolveMediaUrl from "../utils/media-url";

// 视频播放器组件（使用真实视频URL，移除右上上传/下载按钮）
function VideoPlayer({ src }: { src?: string }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [muted, setMuted] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  React.useEffect(() => {
    // 源变更时重置
    const v = videoRef.current;
    if (!v) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    v.pause();
    // 强制重新加载元数据
    v.load();
  }, [src]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(Math.floor(v.duration || 0));
  };

  const onError = () => {
    setError('failed');
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(Math.floor(v.currentTime || 0));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch((error) => {
        console.warn('视频播放失败:', error);
      });
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || time));
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current as any;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((error) => {
        console.warn('退出全屏失败:', error);
      });
    } else {
      el.requestFullscreen?.().catch((error: Error) => {
        console.warn('进入全屏失败:', error);
      });
    }
  };

  return (
    <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden aspect-video">
      {/* 实际视频区域（无原生controls，自定义控制条） */}
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          playsInline
          controls={false}
          muted={muted}
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onError={onError}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <Icon icon="lucide:play-circle" className="text-6xl mb-2 opacity-70" />
            <p className="text-sm opacity-70">暂无视频</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-white text-center text-sm">视频加载失败</div>
        </div>
      )}

      {/* 底部控制栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="flat"
            className="bg-transparent text-white hover:bg-white/20"
            size="sm"
            onPress={togglePlay}
          >
            <Icon icon={isPlaying ? "lucide:pause" : "lucide:play"} className="text-lg" />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-white/30 rounded-full h-1 relative cursor-pointer" onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                handleSeek(Math.floor(ratio * (duration || 0)));
              }}>
                <div 
                  className="bg-white rounded-full h-1 transition-all duration-200"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-white text-sm font-mono">
              {formatTime(duration)}
            </span>
          </div>

          <Button
            isIconOnly
            variant="flat"
            className="bg-transparent text-white hover:bg-white/20"
            size="sm"
            onPress={toggleMute}
          >
            <Icon icon={muted ? "lucide:volume-x" : "lucide:volume-2"} className="text-lg" />
          </Button>

          <Button
            isIconOnly
            variant="flat"
            className="bg-transparent text-white hover:bg-white/20"
            size="sm"
            onPress={toggleFullscreen}
          >
            <Icon icon="lucide:maximize" className="text-lg" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface VideoPreviewSectionProps {
  workflowDetail: {
    title: string;
    author: string;
    authorAvatar: string;
    publishDate: string;
    description: string;
    price: string;
    workflows: number;
    videoUrl?: string;
  };
  className?: string;
}

export default function VideoPreviewSection({ workflowDetail, className = "" }: VideoPreviewSectionProps) {
  return (
    <EditableSection page="workflow-detail" section="main-content">
      <div className="px-0 py-0">
        <div className={`mb-0 overflow-hidden rounded-lg ${className}`}>
          <div className="relative bg-slate-900 text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.3),transparent_70%)]"></div>
            <div className="relative z-10 p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* 左侧内容 */}
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">{workflowDetail.title}</h1>
                
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded border-2 border-white/50 overflow-hidden flex-shrink-0">
                    <img 
                      src={resolveMediaUrl(workflowDetail.authorAvatar) || workflowDetail.authorAvatar}
                      alt={workflowDetail.author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{workflowDetail.author}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Chip
                    startContent={<Icon icon="lucide:layers" />}
                    variant="flat"
                    className="bg-white/20 text-white border-white/30 text-xs px-2 py-0.5"
                    size="sm"
                  >
                    {workflowDetail.workflows} 个工作流
                  </Chip>
                  <Chip
                    startContent={<Icon icon="lucide:tag" />}
                    variant="flat"
                    className="bg-white/20 text-white border-white/30 text-xs px-2 py-0.5"
                    size="sm"
                  >
                    价格 {workflowDetail.price}
                  </Chip>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-white/80 text-sm font-medium">描述:</span>
                  <p className="text-white/95 text-sm">{workflowDetail.description}</p>
                </div>
              </div>

              {/* 右侧视频播放器 */}
              <div className="w-full">
                <VideoPlayer src={workflowDetail.videoUrl} />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </EditableSection>
  );
}
