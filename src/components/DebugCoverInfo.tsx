import React from 'react';
import { Workflow } from '../types/shared';

interface DebugCoverInfoProps {
  workflow: Workflow;
  coverSrc: string;
}

export const DebugCoverInfo: React.FC<DebugCoverInfoProps> = ({ workflow, coverSrc }) => {
  // 只在开发环境显示调试信息
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 bg-black/80 text-white text-xs p-2 z-50 max-w-xs">
      <div>ID: {workflow.id}</div>
      <div>Title: {workflow.title}</div>
      <div>Cover: {workflow.cover ? workflow.cover.substring(0, 50) + '...' : 'null'}</div>
      <div>Preview: {workflow.previewVideo ? 'YES' : 'NO'}</div>
      <div>Demo: {workflow.demoVideo ? 'YES' : 'NO'}</div>
      <div>Final Src: {coverSrc}</div>
    </div>
  );
};

