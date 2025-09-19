import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // 额外渲染的项目数量，用于平滑滚动
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 3
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 渲染的项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 偏移量
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              className="flex-shrink-0"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 自适应高度的虚拟列表（用于高度不固定的项目）
interface VirtualListDynamicProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualListDynamic<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 3
}: VirtualListDynamicProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<number[]>([]);

  // 更新项目高度
  const updateItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newHeights = [...prev];
      newHeights[index] = height;
      return newHeights;
    });
  }, []);

  // 计算累计高度
  const cumulativeHeights = useMemo(() => {
    const heights = new Array(items.length + 1).fill(0);
    for (let i = 0; i < items.length; i++) {
      heights[i + 1] = heights[i] + (itemHeights[i] || estimatedItemHeight);
    }
    return heights;
  }, [items.length, itemHeights, estimatedItemHeight]);

  // 查找可见范围
  const visibleRange = useMemo(() => {
    let start = 0;
    let end = items.length;

    // 二分查找起始位置
    let left = 0, right = items.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (cumulativeHeights[mid] < scrollTop) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    start = Math.max(0, left - overscan);

    // 查找结束位置
    const scrollBottom = scrollTop + containerHeight;
    left = start;
    right = items.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (cumulativeHeights[mid] < scrollBottom) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    end = Math.min(items.length, left + overscan);

    return { start, end };
  }, [scrollTop, containerHeight, cumulativeHeights, items.length, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = cumulativeHeights[items.length];

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.slice(visibleRange.start, visibleRange.end).map((item, relativeIndex) => {
          const absoluteIndex = visibleRange.start + relativeIndex;
          const top = cumulativeHeights[absoluteIndex];
          
          return (
            <VirtualListItem
              key={absoluteIndex}
              index={absoluteIndex}
              top={top}
              onHeightChange={updateItemHeight}
            >
              {renderItem(item, absoluteIndex)}
            </VirtualListItem>
          );
        })}
      </div>
    </div>
  );
}

// 动态高度项目组件
interface VirtualListItemProps {
  index: number;
  top: number;
  children: React.ReactNode;
  onHeightChange: (index: number, height: number) => void;
}

function VirtualListItem({ index, top, children, onHeightChange }: VirtualListItemProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          onHeightChange(index, entry.contentRect.height);
        }
      });

      resizeObserver.observe(ref.current);
      return () => resizeObserver.disconnect();
    }
  }, [index, onHeightChange]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0
      }}
    >
      {children}
    </div>
  );
}

export default VirtualList;
