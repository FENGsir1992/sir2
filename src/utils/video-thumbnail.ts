/**
 * 视频缩略图生成工具
 * 用于从视频URL生成缩略图作为封面
 */

export interface VideoThumbnailOptions {
  /** 缩略图时间点（秒），默认为视频时长的1/3处 */
  time?: number;
  /** 缩略图质量，0-1之间，默认0.8 */
  quality?: number;
  /** 缩略图宽度，默认1280 */
  width?: number;
  /** 缩略图高度，默认720 */
  height?: number;
}

/**
 * 从视频URL生成缩略图
 * @param videoUrl 视频URL
 * @param options 配置选项
 * @returns Promise<string> base64格式的图片数据
 */
export async function generateVideoThumbnail(
  videoUrl: string,
  options: VideoThumbnailOptions = {}
): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('无法创建canvas上下文');
      resolve(null);
      return;
    }

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      const { 
        time = video.duration / 3, // 默认在1/3处截取
        width = 1280,
        height = 720
      } = options;
      
      canvas.width = width;
      canvas.height = height;
      
      // 设置视频时间点
      video.currentTime = Math.min(time, video.duration);
    };
    
    video.onseeked = () => {
      try {
        // 绘制视频帧到canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 生成base64图片数据
        const thumbnailData = canvas.toDataURL('image/jpeg', options.quality || 0.8);
        
        console.log(`✅ 视频缩略图生成成功: ${videoUrl}`);
        resolve(thumbnailData);
      } catch (error) {
        console.error('生成视频缩略图失败:', error);
        resolve(null);
      } finally {
        // 清理资源
        video.src = '';
        video.load();
      }
    };
    
    video.onerror = (error) => {
      console.error('视频加载失败:', error);
      resolve(null);
    };
    
    // 移除不存在的ontimeout属性
    
    // 设置超时
    setTimeout(() => {
      if (video.readyState < 2) {
        console.error('视频加载超时');
        resolve(null);
      }
    }, 10000); // 10秒超时
    
    video.src = videoUrl;
    video.load();
  });
}

/**
 * 批量生成视频缩略图
 * @param videoUrls 视频URL数组
 * @param options 配置选项
 * @returns Promise<(string | null)[]> 缩略图数据数组
 */
export async function generateVideoThumbnails(
  videoUrls: string[],
  options: VideoThumbnailOptions = {}
): Promise<(string | null)[]> {
  const promises = videoUrls.map(url => generateVideoThumbnail(url, options));
  return Promise.all(promises);
}

/**
 * 检查是否为有效的视频URL
 * @param url 待检查的URL
 * @returns boolean
 */
export function isVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  
  return videoExtensions.some(ext => lowerUrl.includes(ext));
}

/**
 * 从工作流数据中获取最佳视频URL用于生成缩略图
 * @param workflow 工作流对象
 * @returns string | null
 */
export function getBestVideoUrlForThumbnail(workflow: any): string | null {
  // 优先使用预览视频
  if (workflow.previewVideo && isVideoUrl(workflow.previewVideo)) {
    return workflow.previewVideo;
  }
  
  // 其次使用演示视频
  if (workflow.demoVideo && isVideoUrl(workflow.demoVideo)) {
    return workflow.demoVideo;
  }
  
  return null;
}

