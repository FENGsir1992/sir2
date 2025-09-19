import { useState, useEffect, useCallback } from 'react';
import { reviewApi } from '../utils/api-client';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userAvatar?: string;
}

interface ReviewStatistics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistics: ReviewStatistics;
}

export function useReviews(workflowId: string, params: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await reviewApi.getReviews(workflowId, params);
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(response.error || '获取评论失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '获取评论失败';
      console.error('获取评论失败:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workflowId, params.page, params.limit, params.sortBy, params.sortOrder]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    data,
    reviews: data?.reviews || [],
    pagination: data?.pagination || null,
    statistics: data?.statistics || null,
    loading,
    error,
    refresh: fetchReviews
  };
}

export function useMyReview(workflowId: string) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchMyReview = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);

    try {
      const response = await reviewApi.getMyReview(workflowId);
      
      if (response.success) {
        setReview(response.data);
      }
    } catch (err) {
      console.error('获取我的评价失败:', err);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  const submitReview = useCallback(async (data: {
    rating: number;
    comment?: string;
  }) => {
    if (!workflowId) return { success: false, error: '工作流ID不存在' };

    setSubmitting(true);

    try {
      const response = await reviewApi.createOrUpdateReview(workflowId, data);
      
      if (response.success) {
        await fetchMyReview(); // 重新获取我的评价
      }

      return {
        success: response.success,
        message: response.message,
        error: response.error
      };
    } catch (err) {
      const errorMessage = (err as Error).message || '提交评价失败';
      console.error('提交评价失败:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  }, [workflowId, fetchMyReview]);

  const deleteReview = useCallback(async () => {
    if (!workflowId) return { success: false, error: '工作流ID不存在' };

    setSubmitting(true);

    try {
      const response = await reviewApi.deleteReview(workflowId);
      
      if (response.success) {
        setReview(null);
      }

      return {
        success: response.success,
        message: response.message,
        error: response.error
      };
    } catch (err) {
      const errorMessage = (err as Error).message || '删除评价失败';
      console.error('删除评价失败:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchMyReview();
  }, [fetchMyReview]);

  return {
    review,
    loading,
    submitting,
    submitReview,
    deleteReview,
    refresh: fetchMyReview
  };
}

