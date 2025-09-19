import { Router, Request, Response } from 'express';
import { db } from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// 获取购物车
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const cartItems = await db('cart_items')
      .join('workflows', 'cart_items.workflowId', 'workflows.id')
      .select(
        'cart_items.id',
        'cart_items.quantity',
        'cart_items.createdAt',
        'workflows.id as workflowId',
        'workflows.title',
        'workflows.author',
        'workflows.price',
        'workflows.originalPrice',
        'workflows.isVip',
        'workflows.isFree',
        'workflows.cover',
        'workflows.workflowCount'
      )
      .where('cart_items.userId', userId)
      .orderBy('cart_items.createdAt', 'desc');

    const totalAmount = cartItems.reduce((sum, item) => {
      const itemPrice = item.isFree ? 0 : item.price;
      return sum + (itemPrice * item.quantity);
    }, 0);

    return res.json({
      success: true,
      data: {
        items: cartItems,
        totalAmount,
        totalItems: cartItems.length
      }
    });

  } catch (error) {
    console.error('获取购物车失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 添加到购物车
router.post('/add', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId, quantity = 1 } = req.body;
    const userId = req.user?.id;

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: '工作流ID为必填项',
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

    // 检查是否已在购物车中
    const existingItem = await db('cart_items')
      .where('userId', userId)
      .where('workflowId', workflowId)
      .first();

    if (existingItem) {
      // 更新数量
      await db('cart_items')
        .where('id', existingItem.id)
        .update({
          quantity: existingItem.quantity + quantity,
          createdAt: new Date() // 更新时间，让它排到前面
        });
    } else {
      // 新增购物车项
      await db('cart_items').insert({
        id: uuidv4(),
        userId,
        workflowId,
        quantity,
        createdAt: new Date()
      });
    }

    return res.json({
      success: true,
      message: '已添加到购物车'
    });

  } catch (error) {
    console.error('添加购物车失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 更新购物车项数量
router.put('/update/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: '数量必须大于0',
        code: 'VALIDATION_ERROR'
      });
    }

    // 检查购物车项是否存在且属于当前用户
    const cartItem = await db('cart_items')
      .where('id', id)
      .where('userId', userId)
      .first();

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        error: '购物车项不存在',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    await db('cart_items')
      .where('id', id)
      .update({ quantity });

    return res.json({
      success: true,
      message: '购物车已更新'
    });

  } catch (error) {
    console.error('更新购物车失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 删除购物车项
router.delete('/remove/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 检查购物车项是否存在且属于当前用户
    const cartItem = await db('cart_items')
      .where('id', id)
      .where('userId', userId)
      .first();

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        error: '购物车项不存在',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    await db('cart_items').where('id', id).del();

    return res.json({
      success: true,
      message: '已从购物车移除'
    });

  } catch (error) {
    console.error('删除购物车项失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 清空购物车
router.delete('/clear', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    await db('cart_items').where('userId', userId).del();

    return res.json({
      success: true,
      message: '购物车已清空'
    });

  } catch (error) {
    console.error('清空购物车失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

export default router;