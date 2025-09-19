import React from 'react';
import { Card, CardBody, Skeleton } from '@heroui/react';

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => {
  return (
    <Card className={`h-full ${className}`}>
      <CardBody className="flex flex-col gap-3 p-4">
        {/* 顶部图片区域 */}
        <Skeleton className="rounded-lg">
          <div className="h-32 rounded-lg bg-default-300"></div>
        </Skeleton>
        
        {/* 标题 */}
        <div className="space-y-2">
          <Skeleton className="w-3/4 rounded-lg">
            <div className="h-4 w-3/4 rounded-lg bg-default-200"></div>
          </Skeleton>
          <Skeleton className="w-1/2 rounded-lg">
            <div className="h-3 w-1/2 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
        
        {/* 标签区域 */}
        <div className="flex gap-2">
          <Skeleton className="w-16 rounded-full">
            <div className="h-6 w-16 rounded-full bg-default-200"></div>
          </Skeleton>
          <Skeleton className="w-20 rounded-full">
            <div className="h-6 w-20 rounded-full bg-default-200"></div>
          </Skeleton>
        </div>
        
        {/* 底部按钮区域 */}
        <div className="flex gap-2 mt-2">
          <Skeleton className="w-24 rounded-lg">
            <div className="h-8 w-24 rounded-lg bg-default-200"></div>
          </Skeleton>
          <Skeleton className="w-16 rounded-lg">
            <div className="h-8 w-16 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
      </CardBody>
    </Card>
  );
};

export default SkeletonCard;
