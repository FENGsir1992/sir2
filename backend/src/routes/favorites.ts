import { Router, Request, Response } from 'express';
import { db } from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { favoritesLimiter } from '../middleware/rate-limit.js';

const router = Router();

// 获取用户收藏列表
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;

    // 获取收藏的工作流
    let query = db('user_favorites')
      .join('workflows', 'user_favorites.workflowId', 'workflows.id')
      .select(
        'user_favorites.id as favoriteId',
        'user_favorites.createdAt as favoriteDate',
        'workflows.*'
      )
      .where('user_favorites.userId', userId)
      .where('workflows.status', 'published')
      .orderBy('user_favorites.createdAt', 'desc');

    // 获取总数
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const total = totalResult[0]?.count || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(limit);
    const favorites = await query.limit(Number(limit)).offset(offset);

    // 处理JSON字段
    const processedFavorites = favorites.map(favorite => ({
      ...favorite,
      tags: favorite.tags ? JSON.parse(favorite.tags) : [],
      gallery: favorite.gallery ? JSON.parse(favorite.gallery) : [],
      features: favorite.features ? JSON.parse(favorite.features) : []
    }));

    const totalPages = Math.ceil(Number(total) / Number(limit));

    return res.json({
      success: true,
      data: {
        favorites: processedFavorites,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(total),
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('获取收藏列表失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 添加收藏
router.post('/:workflowId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user?.id;

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

    // 检查是否已收藏
    const existingFavorite = await db('user_favorites')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .first();

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        error: '已经收藏过此工作流',
        code: 'ALREADY_FAVORITED'
      });
    }

    // 添加收藏
    await db('user_favorites').insert({
      id: uuidv4(),
      userId,
      workflowId,
      createdAt: new Date()
    });

    return res.json({
      success: true,
      message: '收藏成功'
    });

  } catch (error) {
    console.error('添加收藏失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 取消收藏
router.delete('/:workflowId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user?.id;

    // 检查收藏是否存在
    const favorite = await db('user_favorites')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .first();

    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: '收藏记录不存在',
        code: 'FAVORITE_NOT_FOUND'
      });
    }

    // 删除收藏
    await db('user_favorites')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .del();

    return res.json({
      success: true,
      message: '取消收藏成功'
    });

  } catch (error) {
    console.error('取消收藏失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 检查是否已收藏 - 应用专门的速率限制器
router.get('/check/:workflowId', favoritesLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user?.id;

    const favorite = await db('user_favorites')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .first();

    return res.json({
      success: true,
      data: {
        isFavorited: !!favorite,
        favoriteDate: favorite?.createdAt || null
      }
    });

  } catch (error) {
    console.error('检查收藏状态失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

export default router;
