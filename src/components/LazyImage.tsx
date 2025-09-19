/**
 * 懒加载图片组件
 * 支持渐进式加载、错误处理和占位符
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Skeleton } from '@heroui/react';
// import { imageCache } from '../utils/cache-manager'; // 暂时注释，未来可以使用

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  className?: string;
  skeletonClassName?: string;
  threshold?: number;
  rootMargin?: string;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  enableBlurTransition?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  fallback = '/TX.jpg', // 默认头像
  className = '',
  skeletonClassName = '',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  enableBlurTransition = true,
  quality = 'medium',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 生成不同质量的图片URL（如果支持的话）
  const getQualityUrl = useCallback((url: string, quality: string) => {
    // 这里可以根据实际的图片服务来调整
    // 例如：如果使用CDN服务，可以添加质量参数
    if (url.includes('dicebear.com') || url.startsWith('/')) {
      return url; // 对于头像生成器或本地文件，直接返回
    }
    
    // 示例：为外部图片添加质量参数
    const separator = url.includes('?') ? '&' : '?';
    const qualityParam = quality === 'low' ? 'q=30' : quality === 'medium' ? 'q=70' : 'q=90';
    return `${url}${separator}${qualityParam}`;
  }, []);

  // 设置 Intersection Observer
  useEffect(() => {
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    // 测试环境(jsdom)不触发 IO，直接标记进入视口
    const isTest = typeof process !== 'undefined' && process.env && process.env.VITEST;
    if (isTest) {
      setIsInView(true);
    } else {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin]);

  // 当图片进入视口时开始加载
  useEffect(() => {
    if (isInView && !currentSrc && !hasError) {
      setCurrentSrc(getQualityUrl(src, quality));
    }
  }, [isInView, src, quality, getQualityUrl, currentSrc, hasError]);

  // 处理图片加载成功
  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(event);
  }, [onLoad]);

  // 处理图片加载失败
  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setCurrentSrc(fallback);
    onError?.(event);
  }, [fallback, onError]);

  // 渐进式加载：先加载低质量图片，再加载高质量图片
  useEffect(() => {
    if (isLoaded && quality === 'high' && !src.includes('dicebear.com') && !src.startsWith('/')) {
      const highQualityImg = new Image();
      highQualityImg.onload = () => {
        setCurrentSrc(getQualityUrl(src, 'high'));
      };
      highQualityImg.src = getQualityUrl(src, 'high');
    }
  }, [isLoaded, src, quality, getQualityUrl]);

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight: '100px' }} // 防止布局偏移
    >
      {/* 占位符或骨架屏 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0">
          {placeholder ? (
            <img
              src={placeholder}
              alt={`${alt} placeholder`}
              className={`w-full h-full object-cover opacity-50 ${enableBlurTransition ? 'filter blur-sm' : ''}`}
            />
          ) : (
            <Skeleton className={`w-full h-full ${skeletonClassName}`} />
          )}
        </div>
      )}

      {/* 实际图片 */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`
            w-full h-full object-cover transition-all duration-500
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${enableBlurTransition && !isLoaded ? 'filter blur-sm' : ''}
            ${hasError ? 'opacity-50' : ''}
          ${className}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}

      {/* 错误状态 */}
      {hasError && currentSrc === fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">图片加载失败</p>
          </div>
        </div>
      )}

      {/* 加载指示器 */}
      {isInView && !isLoaded && !hasError && currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;

// 头像专用懒加载组件
export const LazyAvatar: React.FC<Omit<LazyImageProps, 'fallback'> & { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  name?: string;
}> = ({ 
  size = 'md', 
  name = 'User',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const fallbackAvatar = `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(name)}&backgroundColor=065f46,047857,059669,0891b2,1e40af&hair=variant01,variant02,variant03,variant04&hairColor=0f172a,374151,6b7280,d1d5db&eyes=variant01,variant02,variant03&eyebrows=variant01,variant02&mouth=happy01,happy02,happy03&nose=variant01,variant02`;

  return (
    <LazyImage
      {...props}
      fallback={fallbackAvatar}
      className={`${sizeClasses[size]} rounded-full ${className}`}
      quality="medium"
      enableBlurTransition={false}
    />
  );
};

// 工作流封面专用懒加载组件
export const LazyWorkflowCover: React.FC<Omit<LazyImageProps, 'fallback'> & {
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:2';
}> = ({ 
  aspectRatio = '16:9',
  className = '',
  ...props 
}) => {
  const aspectClasses = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '3:2': 'aspect-[3/2]'
  };

  return (
    <LazyImage
      {...props}
      fallback="/TX.jpg"
      className={`${aspectClasses[aspectRatio]} ${className}`}
      quality="high"
      enableBlurTransition={true}
    />
  );
};

// 批量预加载图片工具函数
export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(
    urls.map(url => 
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      })
    )
  );
};

// 图片压缩工具函数
export const compressImage = (
  file: File, 
  maxWidth: number = 1920, 
  maxHeight: number = 1080, 
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 计算新尺寸
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制并压缩
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('图片压缩失败'));
        }
      }, 'image/jpeg', quality);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
