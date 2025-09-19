import { Router, Request, Response } from 'express';
import { db } from '../database/init.js';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { AuthRequest, optionalAuth } from '../middleware/auth.js';

const router = Router();

// 获取个性化推荐
router.get('/personalized', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 10 } = req.query;

    let recommendedWorkflows = [];

    if (userId) {
      // 已登录用户的个性化推荐
      recommendedWorkflows = await getPersonalizedRecommendations(userId, Number(limit));
    } else {
      // 未登录用户的通用推荐
      recommendedWorkflows = await getPopularRecommendations(Number(limit));
    }

    // 处理JSON字段
    const processedWorkflows = recommendedWorkflows.map(workflow => ({
      ...workflow,
      tags: workflow.tags ? JSON.parse(workflow.tags) : [],
      gallery: workflow.gallery ? JSON.parse(workflow.gallery) : [],
      features: workflow.features ? JSON.parse(workflow.features) : []
    }));

    return res.json({
      success: true,
      data: processedWorkflows
    });

  } catch (error) {
    console.error('获取推荐失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取相似工作流推荐
router.get('/similar/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { limit = 6 } = req.query;

    // 检查工作流是否存在
    const workflow = await db('workflows')
      .where('id', workflowId)
      .where('status', 'published')
      .first();

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在或未发布',
        code: 'WORKFLOW_NOT_FOUND'
      });
    }

    const similarWorkflows = await getSimilarWorkflows(workflowId!, Number(limit));

    // 处理JSON字段
    const processedWorkflows = similarWorkflows.map(w => ({
      ...w,
      tags: w.tags ? JSON.parse(w.tags) : [],
      gallery: w.gallery ? JSON.parse(w.gallery) : [],
      features: w.features ? JSON.parse(w.features) : []
    }));

    return res.json({
      success: true,
      data: processedWorkflows
    });

  } catch (error) {
    console.error('获取相似推荐失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取热门推荐
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { limit = 10, timeRange = '7d' } = req.query;

    // 计算时间范围
    const timeRangeMap: { [key: string]: number } = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = timeRangeMap[timeRange as string] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 获取热门工作流（基于下载量、评分和最近活跃度）
    const trendingWorkflows = await db('workflows')
      .select('*')
      .where('status', 'published')
      .where('createdAt', '>=', startDate)
      .orderByRaw('(downloadCount * 0.4 + rating * ratingCount * 0.3 + (CASE WHEN isHot THEN 50 ELSE 0 END) * 0.3) DESC')
      .limit(Number(limit));

    // 处理JSON字段
    const processedWorkflows = trendingWorkflows.map(workflow => ({
      ...workflow,
      tags: workflow.tags ? JSON.parse(workflow.tags) : [],
      gallery: workflow.gallery ? JSON.parse(workflow.gallery) : [],
      features: workflow.features ? JSON.parse(workflow.features) : []
    }));

    return res.json({
      success: true,
      data: processedWorkflows
    });

  } catch (error) {
    console.error('获取热门推荐失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 个性化推荐算法
async function getPersonalizedRecommendations(userId: string, limit: number) {
  try {
    // 获取用户的购买历史和收藏
    const userInteractions = await db('order_items')
      .join('orders', 'order_items.orderId', 'orders.id')
      .join('workflows', 'order_items.workflowId', 'workflows.id')
      .select('workflows.category', 'workflows.tags', 'workflows.authorId')
      .where('orders.userId', userId)
      .where('orders.status', 'paid');

    const userFavorites = await db('user_favorites')
      .join('workflows', 'user_favorites.workflowId', 'workflows.id')
      .select('workflows.category', 'workflows.tags', 'workflows.authorId')
      .where('user_favorites.userId', userId);

    // 合并用户偏好数据
    const allInteractions = [...userInteractions, ...userFavorites];
    
    if (allInteractions.length === 0) {
      // 没有历史数据，返回热门推荐
      return getPopularRecommendations(limit);
    }

    // 分析用户偏好
    const categoryPrefs: { [key: string]: number } = {};
    const tagPrefs: { [key: string]: number } = {};
    const authorPrefs: { [key: string]: number } = {};

    allInteractions.forEach(interaction => {
      // 分类偏好
      if (interaction.category) {
        categoryPrefs[interaction.category] = (categoryPrefs[interaction.category] || 0) + 1;
      }

      // 标签偏好
      if (interaction.tags) {
        const tags = JSON.parse(interaction.tags);
        tags.forEach((tag: string) => {
          tagPrefs[tag] = (tagPrefs[tag] || 0) + 1;
        });
      }

      // 作者偏好
      if (interaction.authorId) {
        authorPrefs[interaction.authorId] = (authorPrefs[interaction.authorId] || 0) + 1;
      }
    });

    // 获取已购买的工作流ID
    const purchasedWorkflowIds = await db('order_items')
      .join('orders', 'order_items.orderId', 'orders.id')
      .select('order_items.workflowId')
      .where('orders.userId', userId)
      .where('orders.status', 'paid')
      .pluck('workflowId');

    // 基于偏好推荐工作流
    let query = db('workflows')
      .select('*')
      .where('status', 'published')
      .whereNotIn('id', purchasedWorkflowIds);

    // 构建推荐查询
    const topCategories = Object.entries(categoryPrefs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    const topTags = Object.entries(tagPrefs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    if (topCategories.length > 0) {
      query = query.whereIn('category', topCategories);
    }

    if (topTags.length > 0) {
      query = query.where(function() {
        topTags.forEach(tag => {
          this.orWhereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%"${tag}"%`]);
        });
      });
    }

    // 按评分和下载量排序
    const recommendations = await query
      .orderByRaw('(rating * ratingCount * 0.6 + downloadCount * 0.4) DESC')
      .limit(limit);

    return recommendations;

  } catch (error) {
    console.error('个性化推荐算法错误:', error);
    return getPopularRecommendations(limit);
  }
}

// 获取热门推荐
async function getPopularRecommendations(limit: number) {
  return await db('workflows')
    .select('*')
    .where('status', 'published')
    .orderByRaw('(downloadCount * 0.4 + rating * ratingCount * 0.3 + (CASE WHEN isHot THEN 50 ELSE 0 END) * 0.3) DESC')
    .limit(limit);
}

// 获取相似工作流
async function getSimilarWorkflows(workflowId: string, limit: number) {
  // 获取目标工作流的信息
  const targetWorkflow = await db('workflows')
    .where('id', workflowId)
    .first();

  if (!targetWorkflow) {
    return [];
  }

  const targetTags = targetWorkflow.tags ? JSON.parse(targetWorkflow.tags) : [];
  const targetCategory = targetWorkflow.category;
  const targetAuthor = targetWorkflow.authorId;

  // 查找相似工作流
  let query = db('workflows')
    .select('*')
    .where('status', 'published')
    .where('id', '!=', workflowId);

  // 优先同分类
  if (targetCategory) {
    query = query.where('category', targetCategory);
  }

  const similarWorkflows = await query
    .orderByRaw(`
      (CASE WHEN category = ? THEN 30 ELSE 0 END) +
      (CASE WHEN authorId = ? THEN 20 ELSE 0 END) +
      (rating * 5) +
      (downloadCount / 10)
      DESC
    `, [targetCategory, targetAuthor])
    .limit(limit * 2); // 获取更多候选

  // 基于标签相似度进一步筛选
  const scoredWorkflows = similarWorkflows.map(workflow => {
    const workflowTags = workflow.tags ? JSON.parse(workflow.tags) : [];
    const commonTags = targetTags.filter((tag: string) => workflowTags.includes(tag));
    const tagSimilarity = commonTags.length / Math.max(targetTags.length, workflowTags.length, 1);
    
    return {
      ...workflow,
      similarityScore: tagSimilarity * 100 + 
                      (workflow.category === targetCategory ? 30 : 0) +
                      (workflow.authorId === targetAuthor ? 20 : 0) +
                      workflow.rating * 5
    };
  });

  // 按相似度排序并返回
  return scoredWorkflows
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

export default router;

