import { Router, Request, Response } from 'express';
import { db } from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// 获取订单列表
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, status } = req.query;

    let query = db('orders')
      .where('userId', userId)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', status as string);
    }

    // 获取总数
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const total = totalResult[0]?.count || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(limit);
    const orders = await query.limit(Number(limit)).offset(offset);

    // 【性能优化】使用JOIN查询避免N+1问题，一次性获取所有订单和订单项
    const orderIds = orders.map(order => order.id);
    
    // 批量查询所有订单项
    const allOrderItems = await db('order_items')
      .join('workflows', 'order_items.workflowId', 'workflows.id')
      .select(
        'order_items.orderId',
        'order_items.id',
        'order_items.quantity',
        'order_items.price',
        'workflows.id as workflowId',
        'workflows.title',
        'workflows.author',
        'workflows.cover',
        'workflows.workflowCount'
      )
      .whereIn('order_items.orderId', orderIds);

    // 将订单项按orderId分组
    const itemsByOrderId = allOrderItems.reduce((acc, item) => {
      const orderId = item.orderId;
      if (!acc[orderId]) acc[orderId] = [];
      acc[orderId].push({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        workflowId: item.workflowId,
        title: item.title,
        author: item.author,
        cover: item.cover,
        workflowCount: item.workflowCount
      });
      return acc;
    }, {} as Record<string, any[]>);

    // 组装最终结果
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: itemsByOrderId[order.id] || []
    }));

    const totalPages = Math.ceil(Number(total) / Number(limit));

    return res.json({
      success: true,
      data: {
        orders: ordersWithItems,
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
    console.error('获取订单列表失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取订单详情
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await db('orders')
      .where('id', id)
      .where('userId', userId)
      .first();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 获取订单项
    const orderItems = await db('order_items')
      .join('workflows', 'order_items.workflowId', 'workflows.id')
      .select(
        'order_items.id',
        'order_items.quantity',
        'order_items.price',
        'workflows.id as workflowId',
        'workflows.title',
        'workflows.author',
        'workflows.cover',
        'workflows.workflowCount',
        'workflows.content'
      )
      .where('order_items.orderId', order.id);

    return res.json({
      success: true,
      data: {
        ...order,
        items: orderItems
      }
    });

  } catch (error) {
    console.error('获取订单详情失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 创建订单
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { items, paymentMethod = 'balance' } = req.body;
    const userId = req.user?.id;
    const user = req.user;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '订单项为必填项',
        code: 'VALIDATION_ERROR'
      });
    }

    // 开始事务
    let createdOrderId = '';
    let createdTotalAmount = 0;
    let createdStatus: 'pending' | 'paid' = 'pending';
    await db.transaction(async (trx) => {
      const orderId = uuidv4();
      let totalAmount = 0;
      const orderItems = [];

      // 验证所有工作流并计算总价
      for (const item of items) {
        const workflow = await trx('workflows')
          .where('id', item.workflowId)
          .where('status', 'published')
          .first();

        if (!workflow) {
          throw new Error(`工作流 ${item.workflowId} 不存在或未发布`);
        }

        // 检查用户是否已购买过此工作流
        const existingOrder = await trx('order_items')
          .join('orders', 'order_items.orderId', 'orders.id')
          .where('orders.userId', userId)
          .where('order_items.workflowId', item.workflowId)
          .where('orders.status', 'paid')
          .first();

        if (existingOrder) {
          throw new Error(`您已购买过工作流: ${workflow.title}`);
        }

        // VIP 限时免费策略：
        // - 普通用户可以购买（按标价）
        // - VIP 用户下载免费（价格视为 0）
        const isFreeForCurrentUser = Boolean(workflow.isFree) || (Boolean(workflow.isVip) && Boolean(user?.isVip));
        const itemPrice = isFreeForCurrentUser ? 0 : workflow.price;
        const quantity = item.quantity || 1;
        
        totalAmount += itemPrice * quantity;
        
        orderItems.push({
          id: uuidv4(),
          orderId,
          workflowId: workflow.id,
          workflowTitle: workflow.title,
          quantity,
          price: itemPrice,
          createdAt: new Date()
        });
      }

      // 检查余额（如果使用余额支付）
      if (paymentMethod === 'balance' && totalAmount > 0) {
        if (!user || user.balance < totalAmount) {
          throw new Error('余额不足');
        }
      }

      // 创建订单
      const order = {
        id: orderId,
        userId,
        totalAmount,
        status: totalAmount === 0 ? 'paid' : 'pending', // 免费订单直接标记为已支付
        paymentMethod,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await trx('orders').insert(order);
      await trx('order_items').insert(orderItems);

      // 如果是免费订单或使用余额支付，直接处理支付
      if (totalAmount === 0 || paymentMethod === 'balance') {
        if (totalAmount > 0) {
          // 扣除余额
          await trx('users')
            .where('id', userId)
            .decrement('balance', totalAmount);
        }

        // 更新订单状态
        await trx('orders')
          .where('id', orderId)
          .update({
            status: 'paid',
            updatedAt: new Date()
          });

        // 清空购物车中的相关项目
        const workflowIds = items.map(item => item.workflowId);
        await trx('cart_items')
          .where('userId', userId)
          .whereIn('workflowId', workflowIds)
          .del();
      }

      // 供响应使用
      createdOrderId = orderId;
      createdTotalAmount = totalAmount;
      createdStatus = order.status as any;
    });

    return res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: {
        orderId: createdOrderId,
        totalAmount: createdTotalAmount,
        status: createdStatus
      }
    });

  } catch (error) {
    console.error('创建订单失败:', error);
    return res.status(400).json({
      success: false,
      error: (error as Error).message || SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'ORDER_CREATE_ERROR'
    });
  }
});

// 取消订单
router.put('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await db('orders')
      .where('id', id)
      .where('userId', userId)
      .first();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '只能取消待支付的订单',
        code: 'INVALID_ORDER_STATUS'
      });
    }

    await db('orders')
      .where('id', id)
      .update({
        status: 'cancelled',
        updatedAt: new Date()
      });

    return res.json({
      success: true,
      message: '订单已取消'
    });

  } catch (error) {
    console.error('取消订单失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 确认收货/完成订单
router.put('/:id/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await db('orders')
      .where('id', id)
      .where('userId', userId)
      .first();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: '只能确认已支付的订单',
        code: 'INVALID_ORDER_STATUS'
      });
    }

    await db('orders')
      .where('id', id)
      .update({
        status: 'completed',
        updatedAt: new Date()
      });

    return res.json({
      success: true,
      message: '订单已完成'
    });

  } catch (error) {
    console.error('确认订单失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取用户已购买的工作流
router.get('/purchased/workflows', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;

    // 获取已支付订单中的工作流
    let query = db('order_items')
      .join('orders', 'order_items.orderId', 'orders.id')
      .join('workflows', 'order_items.workflowId', 'workflows.id')
      .select(
        'workflows.*',
        'orders.createdAt as purchaseDate',
        'order_items.price as purchasePrice'
      )
      .where('orders.userId', userId)
      .where('orders.status', 'paid')
      .orderBy('orders.createdAt', 'desc');

    // 获取总数
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const total = totalResult[0]?.count || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(limit);
    const workflows = await query.limit(Number(limit)).offset(offset);

    const totalPages = Math.ceil(Number(total) / Number(limit));

    return res.json({
      success: true,
      data: {
        workflows: workflows.map(workflow => ({
          ...workflow,
          tags: workflow.tags ? JSON.parse(workflow.tags) : [],
          gallery: workflow.gallery ? JSON.parse(workflow.gallery) : [],
          features: workflow.features ? JSON.parse(workflow.features) : []
        })),
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
    console.error('获取已购买工作流失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

export default router;

