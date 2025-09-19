import { Router, Request, Response } from 'express';
import { db } from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// 获取工作流评论列表
router.get('/:workflowId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

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

    // 获取评论列表
    let query = db('workflow_reviews')
      .join('users', 'workflow_reviews.userId', 'users.id')
      .select(
        'workflow_reviews.id',
        'workflow_reviews.rating',
        'workflow_reviews.comment',
        'workflow_reviews.createdAt',
        'workflow_reviews.updatedAt',
        'users.username as userName',
        'users.avatar as userAvatar'
      )
      .where('workflow_reviews.workflowId', workflowId)
      .orderBy(`workflow_reviews.${sortBy}`, sortOrder as string);

    // 获取总数
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const total = totalResult[0]?.count || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(limit);
    const reviews = await query.limit(Number(limit)).offset(offset);

    // 获取评分统计
    const ratingStats = await db('workflow_reviews')
      .select('rating')
      .count('* as count')
      .where('workflowId', workflowId)
      .groupBy('rating')
      .orderBy('rating', 'desc');

    const totalReviews = ratingStats.reduce((sum, stat) => sum + Number(stat.count), 0);
    const averageRating = totalReviews > 0 
      ? ratingStats.reduce((sum, stat) => sum + (Number(stat.rating || 0) * Number(stat.count || 0)), 0) / totalReviews 
      : 0;

    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };

    ratingStats.forEach(stat => {
      ratingDistribution[stat.rating as keyof typeof ratingDistribution] = Number(stat.count);
    });

    const totalPages = Math.ceil(Number(total) / Number(limit));

    return res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(total),
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        },
        statistics: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution
        }
      }
    });

  } catch (error) {
    console.error('获取评论列表失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 创建或更新评论
router.post('/:workflowId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    // 输入验证
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: '评分必须在1-5之间',
        code: 'VALIDATION_ERROR'
      });
    }

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

    // 检查用户是否已购买此工作流
    const hasPurchased = await db('order_items')
      .join('orders', 'order_items.orderId', 'orders.id')
      .where('orders.userId', userId)
      .where('order_items.workflowId', workflowId)
      .where('orders.status', 'paid')
      .first();

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        error: '只有购买过的用户才能评价',
        code: 'PURCHASE_REQUIRED'
      });
    }

    // 检查是否已有评价
    const existingReview = await db('workflow_reviews')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .first();

    const now = new Date();

    if (existingReview) {
      // 更新现有评价
      await db('workflow_reviews')
        .where('id', existingReview.id)
        .update({
          rating,
          comment: comment || null,
          updatedAt: now
        });

      return res.json({
        success: true,
        message: '评价更新成功'
      });
    } else {
      // 创建新评价
      await db('workflow_reviews').insert({
        id: uuidv4(),
        userId,
        workflowId,
        rating,
        comment: comment || null,
        createdAt: now,
        updatedAt: now
      });

      // 更新工作流的平均评分和评价数量
      if (workflowId) {
        await updateWorkflowRating(workflowId);
      }

      return res.status(201).json({
        success: true,
        message: '评价创建成功'
      });
    }

  } catch (error) {
    console.error('创建/更新评价失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 删除评论
router.delete('/:workflowId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user?.id;

    // 检查评价是否存在
    const review = await db('workflow_reviews')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .first();

    if (!review) {
      return res.status(404).json({
        success: false,
        error: '评价不存在',
        code: 'REVIEW_NOT_FOUND'
      });
    }

    // 删除评价
    await db('workflow_reviews')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .del();

    // 更新工作流的平均评分和评价数量
    if (workflowId) {
      await updateWorkflowRating(workflowId);
    }

    return res.json({
      success: true,
      message: '评价删除成功'
    });

  } catch (error) {
    console.error('删除评价失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取用户对特定工作流的评价
router.get('/:workflowId/my-review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user?.id;

    const review = await db('workflow_reviews')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .first();

    return res.json({
      success: true,
      data: review || null
    });

  } catch (error) {
    console.error('获取用户评价失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 更新工作流的平均评分和评价数量
async function updateWorkflowRating(workflowId: string) {
  try {
    const result = await db('workflow_reviews')
      .where('workflowId', workflowId)
      .avg('rating as avgRating')
      .count('* as totalRating')
      .first();

    const averageRating = Number(result?.avgRating || 0);
    const ratingCount = Number(result?.totalRating || 0);

    await db('workflows')
      .where('id', workflowId)
      .update({
        rating: Math.round(averageRating * 10) / 10, // 保留1位小数
        ratingCount,
        updatedAt: new Date()
      });

  } catch (error) {
    console.error('更新工作流评分失败:', error);
  }
}

export default router;
