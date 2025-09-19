import { useState, useEffect, useCallback, useRef } from 'react';
import { favoriteApi } from '../utils/api-client';
import { Workflow } from '../types/shared';

// 简单的内存缓存，避免重复的收藏状态检查
const favoriteStatusCache = new Map<string, { isFavorited: boolean; favoriteDate: string | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

interface FavoritesResponse {
  favorites: Workflow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useFavorites(params: { page?: number; limit?: number } = {}) {
  const [data, setData] = useState<FavoritesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await favoriteApi.getFavorites(params);
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(response.error || '获取收藏列表失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '获取收藏列表失败';
      console.error('获取收藏列表失败:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    data,
    favorites: data?.favorites || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refresh: fetchFavorites
  };
}

export function useFavorite(workflowId: string) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favoriteDate, setFavoriteDate] = useState<string | null>(null);
  const checkInProgressRef = useRef(false);

  const checkFavoriteStatus = useCallback(async () => {
    if (!workflowId || checkInProgressRef.current) return;

    // 检查缓存
    const cached = favoriteStatusCache.get(workflowId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setIsFavorited(cached.isFavorited);
      setFavoriteDate(cached.favoriteDate);
      return;
    }

    checkInProgressRef.current = true;
    try {
      const response = await favoriteApi.checkFavorite(workflowId);
      
      if (response.success && response.data) {
        const { isFavorited: favorited, favoriteDate: date } = response.data;
        setIsFavorited(favorited);
        setFavoriteDate(date);
        
        // 更新缓存
        favoriteStatusCache.set(workflowId, {
          isFavorited: favorited,
          favoriteDate: date,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('检查收藏状态失败:', err);
    } finally {
      checkInProgressRef.current = false;
    }
  }, [workflowId]);

  const toggleFavorite = useCallback(async () => {
    if (!workflowId) return { success: false, error: '工作流ID不存在' };

    setLoading(true);

    try {
      let response;
      
      if (isFavorited) {
        response = await favoriteApi.removeFavorite(workflowId);
        if (response.success) {
          setIsFavorited(false);
          setFavoriteDate(null);
          // 清除缓存
          favoriteStatusCache.delete(workflowId);
        }
      } else {
        response = await favoriteApi.addFavorite(workflowId);
        if (response.success) {
          const newDate = new Date().toISOString();
          setIsFavorited(true);
          setFavoriteDate(newDate);
          // 更新缓存
          favoriteStatusCache.set(workflowId, {
            isFavorited: true,
            favoriteDate: newDate,
            timestamp: Date.now()
          });
        }
      }

      return {
        success: response.success,
        message: response.message,
        error: response.error
      };
    } catch (err) {
      const errorMessage = (err as Error).message || '操作失败';
      console.error('收藏操作失败:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [workflowId, isFavorited]);

  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  return {
    isFavorited,
    favoriteDate,
    loading,
    toggleFavorite,
    refresh: checkFavoriteStatus
  };
}

