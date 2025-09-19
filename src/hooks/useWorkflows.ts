import { useState, useEffect, useCallback } from 'react';
import { workflowApi } from '../utils/api-client';
import { Workflow } from '../types/shared';

interface UseWorkflowsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tags?: string;
  isVip?: boolean;
  isFree?: boolean;
  isHot?: boolean;
  isNew?: boolean;
  priceRange?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoLoad?: boolean;
}

interface WorkflowsResponse {
  workflows: Workflow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useWorkflows(params: UseWorkflowsParams = {}) {
  const [data, setData] = useState<WorkflowsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const {
    page = 1,
    limit = 20,
    search = '',
    category = '',
    tags = '',
    isVip,
    isFree,
    isHot,
    isNew,
    priceRange = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    autoLoad = true
  } = params;

  const fetchWorkflows = useCallback(async (newParams?: Partial<UseWorkflowsParams>) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        page: newParams?.page ?? page,
        limit: newParams?.limit ?? limit,
        search: newParams?.search ?? search,
        category: newParams?.category ?? category,
        tags: newParams?.tags ?? tags,
        isVip: newParams?.isVip ?? isVip,
        isFree: newParams?.isFree ?? isFree,
        isHot: newParams?.isHot ?? isHot,
        isNew: newParams?.isNew ?? isNew,
        priceRange: newParams?.priceRange ?? priceRange,
        sortBy: newParams?.sortBy ?? sortBy,
        sortOrder: newParams?.sortOrder ?? sortOrder,
      };

      // 过滤掉undefined的参数
      const filteredParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, value]) => value !== undefined && value !== '')
      );

      console.log('🔍 获取工作流列表，参数:', filteredParams);

      const response = await workflowApi.getWorkflows(filteredParams);

      if (response.success && response.data) {
        setData(response.data);
        console.log(`✅ 获取到 ${response.data.workflows.length} 个工作流`);
      } else {
        throw new Error(response.error || '获取工作流列表失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '获取工作流列表失败';
      console.error('❌ 获取工作流列表失败:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [page, limit, search, category, tags, isVip, isFree, isHot, isNew, priceRange, sortBy, sortOrder]);

  // 刷新数据
  const refresh = useCallback(() => {
    return fetchWorkflows();
  }, [fetchWorkflows]);

  // 加载更多（用于无限滚动）
  const loadMore = useCallback(async () => {
    if (!data || loading || !data.pagination.hasNext) return;
    
    const nextPage = data.pagination.page + 1;
    setLoading(true);

    try {
      const response = await workflowApi.getWorkflows({
        page: nextPage,
        limit,
        search,
        category,
        tags,
        isVip,
        isFree,
        isHot,
        isNew,
        priceRange,
        sortBy,
        sortOrder,
      });

      if (response.success && response.data) {
        setData(prevData => {
          if (!prevData) return response.data;
          
          return {
            workflows: [...prevData.workflows, ...response.data.workflows],
            pagination: response.data.pagination
          };
        });
      }
    } catch (err) {
      console.error('加载更多工作流失败:', err);
      setError((err as Error).message || '加载更多失败');
    } finally {
      setLoading(false);
    }
  }, [data, loading, limit, search, category, tags, isVip, isFree, isHot, isNew, priceRange, sortBy, sortOrder]);

  // 搜索
  const searchWorkflows = useCallback((query: string) => {
    fetchWorkflows({ search: query, page: 1 });
  }, [fetchWorkflows]);

  // 筛选
  const filter = useCallback((filters: Partial<UseWorkflowsParams>) => {
    fetchWorkflows({ ...filters, page: 1 });
  }, [fetchWorkflows]);

  // 自动加载
  useEffect(() => {
    if (autoLoad && !initialized) {
      fetchWorkflows();
    }
  }, [autoLoad, initialized, fetchWorkflows]);

  // 跨页面实时联动：监听管理端触发的更新事件
  useEffect(() => {
    const handler = () => {
      // 先清理相关缓存，再刷新
      try {
        workflowApi.invalidateCache();
      } catch {}
      fetchWorkflows();
    };
    window.addEventListener('workflows:changed', handler);
    // 监听 localStorage 广播的缓存更新信号（支持跨标签页/SSR切换后回到前端）
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'wz.workflows.cache.bump') {
        try { workflowApi.invalidateCache(); } catch {}
        fetchWorkflows();
      }
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('workflows:changed', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [fetchWorkflows]);

  return {
    data,
    workflows: data?.workflows || [],
    pagination: data?.pagination || null,
    loading,
    error,
    initialized,
    refresh,
    loadMore,
    search: searchWorkflows,
    filter,
    fetchWorkflows
  };
}

// 获取单个工作流详情的Hook
export function useWorkflow(id: string) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await workflowApi.getWorkflow(id);
      
      if (response.success && response.data) {
        setWorkflow(response.data);
      } else {
        throw new Error(response.error || '获取工作流详情失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '获取工作流详情失败';
      console.error('获取工作流详情失败:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  return {
    workflow,
    loading,
    error,
    refresh: fetchWorkflow
  };
}

// 获取推荐工作流的Hook
export function useRecommendedWorkflows(limit: number = 6) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommended = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await workflowApi.getRecommended(limit);
      
      if (response.success && response.data) {
        setWorkflows(response.data);
      } else {
        throw new Error(response.error || '获取推荐工作流失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '获取推荐工作流失败';
      console.error('获取推荐工作流失败:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecommended();
  }, [fetchRecommended]);

  return {
    workflows,
    loading,
    error,
    refresh: fetchRecommended
  };
}

// 获取每日推荐的Hook（最多3个）
export function useDailyRecommendedWorkflows(limit: number = 3) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await workflowApi.getDailyRecommended(limit);
      if (response.success && response.data) {
        setWorkflows(response.data);
      } else {
        throw new Error(response.error || '获取每日推荐失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '获取每日推荐失败';
      console.error('获取每日推荐失败:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  return { workflows, loading, error, refresh: fetchDaily };
}
