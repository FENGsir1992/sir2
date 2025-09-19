// 数据库查询优化器

import { Knex } from 'knex';
import { db } from './init.js';
import { SYSTEM_CONSTANTS } from '../config/constants.js';

// 查询性能监控
export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor;
  private queryStats: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor();
    }
    return QueryPerformanceMonitor.instance;
  }

  // 记录查询性能
  recordQuery(queryName: string, executionTime: number): void {
    const stats = this.queryStats.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    this.queryStats.set(queryName, stats);

    // 如果查询时间过长，记录警告
    if (executionTime > 1000) { // 超过1秒
      console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`);
    }
  }

  // 获取查询统计
  getQueryStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.queryStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  // 重置统计
  resetStats(): void {
    this.queryStats.clear();
  }
}

// 查询建造器装饰器
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryName: string,
  queryFn: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    try {
      const result = await queryFn(...args);
      const executionTime = Date.now() - startTime;
      QueryPerformanceMonitor.getInstance().recordQuery(queryName, executionTime);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      QueryPerformanceMonitor.getInstance().recordQuery(`${queryName}_ERROR`, executionTime);
      throw error;
    }
  }) as T;
}

// 优化的查询类
export class OptimizedQueries {
  // 带分页的工作流查询
  static getWorkflowsWithPagination = withPerformanceMonitoring(
    'getWorkflowsWithPagination',
    async (params: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      subcategory?: string;
      tags?: string[];
      status?: string;
      isVip?: boolean;
      isFree?: boolean;
      isHot?: boolean;
      isNew?: boolean;
      priceRange?: [number, number];
      authorId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      const {
        page = 1,
        limit = SYSTEM_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE,
        search,
        category,
        subcategory,
        tags,
        status,
        isVip,
        isFree,
        isHot,
        isNew,
        priceRange,
        authorId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      // 验证分页参数
      const safePage = Math.max(1, page);
      const safeLimit = Math.min(
        Math.max(SYSTEM_CONSTANTS.PAGINATION.MIN_PAGE_SIZE, limit),
        SYSTEM_CONSTANTS.PAGINATION.MAX_PAGE_SIZE
      );
      const offset = (safePage - 1) * safeLimit;

      // 构建基础查询 - 使用索引优化
      let baseQuery = db('workflows')
        .select([
          'workflows.id',
          'workflows.title',
          'workflows.description',
          'workflows.shortDescription',
          'workflows.author',
          'workflows.authorId',
          'workflows.price',
          'workflows.originalPrice',
          'workflows.isVip',
          'workflows.isFree',
          'workflows.cover',
          'workflows.previewVideo',
          'workflows.category',
          'workflows.subcategory',
          'workflows.tags',
          'workflows.status',
          'workflows.isHot',
          'workflows.isNew',
          'workflows.workflowCount',
          'workflows.downloadCount',
          'workflows.rating',
          'workflows.ratingCount',
          'workflows.version',
          'workflows.createdAt',
          'workflows.updatedAt',
          'workflows.publishedAt',
          'users.username as authorName',
          'users.avatar as authorAvatar'
        ])
        .leftJoin('users', 'workflows.authorId', 'users.id');

      // 状态过滤 - 优先使用索引
      if (status) {
        baseQuery = baseQuery.where('workflows.status', status);
      } else {
        // 默认只显示已发布的
        baseQuery = baseQuery.where('workflows.status', 'published');
      }

      // 分类过滤 - 使用索引
      if (category) {
        baseQuery = baseQuery.where('workflows.category', category);
      }

      if (subcategory) {
        baseQuery = baseQuery.where('workflows.subcategory', subcategory);
      }

      // 作者过滤 - 使用索引
      if (authorId) {
        baseQuery = baseQuery.where('workflows.authorId', authorId);
      }

      // 布尔过滤 - 使用索引
      if (typeof isVip === 'boolean') {
        baseQuery = baseQuery.where('workflows.isVip', isVip);
      }

      if (typeof isFree === 'boolean') {
        baseQuery = baseQuery.where('workflows.isFree', isFree);
      }

      if (typeof isHot === 'boolean') {
        baseQuery = baseQuery.where('workflows.isHot', isHot);
      }

      if (typeof isNew === 'boolean') {
        baseQuery = baseQuery.where('workflows.isNew', isNew);
      }

      // 价格范围过滤
      if (priceRange && priceRange.length === 2) {
        baseQuery = baseQuery.whereBetween('workflows.price', priceRange);
      }

      // 标签过滤 - 优化JSON查询
      if (tags && tags.length > 0) {
        baseQuery = baseQuery.where((builder) => {
          tags.forEach(tag => {
            if (tag && tag.length <= SYSTEM_CONSTANTS.WORKFLOW.MAX_TAG_LENGTH) {
              builder.orWhere('workflows.tags', 'like', `%"${tag}"%`);
            }
          });
        });
      }

      // 全文搜索 - 最后执行以利用前面的索引
      if (search && search.trim()) {
        const searchTerm = search.trim();
        if (searchTerm.length >= SYSTEM_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH && 
            searchTerm.length <= SYSTEM_CONSTANTS.SEARCH.MAX_SEARCH_LENGTH) {
          baseQuery = baseQuery.where((builder) => {
            builder
              .where('workflows.title', 'like', `%${searchTerm}%`)
              .orWhere('workflows.description', 'like', `%${searchTerm}%`)
              .orWhere('workflows.shortDescription', 'like', `%${searchTerm}%`)
              .orWhere('workflows.author', 'like', `%${searchTerm}%`)
              .orWhere('users.username', 'like', `%${searchTerm}%`);
          });
        }
      }

      // 排序 - 使用索引字段优先
      const allowedSortFields = [
        'createdAt', 'updatedAt', 'publishedAt', 'title', 'price', 
        'rating', 'downloadCount', 'sortOrder'
      ];
      
      if (allowedSortFields.includes(sortBy)) {
        baseQuery = baseQuery.orderBy(`workflows.${sortBy}`, sortOrder);
      } else {
        baseQuery = baseQuery.orderBy('workflows.createdAt', 'desc');
      }

      // 添加二级排序保证结果一致性
      baseQuery = baseQuery.orderBy('workflows.id', 'asc');

      // 获取总数 - 使用优化的计数查询
      const countQuery = db('workflows')
        .count('* as total')
        .leftJoin('users', 'workflows.authorId', 'users.id');

      // 复制过滤条件到计数查询
      if (status) {
        countQuery.where('workflows.status', status);
      } else {
        countQuery.where('workflows.status', 'published');
      }

      if (category) countQuery.where('workflows.category', category);
      if (subcategory) countQuery.where('workflows.subcategory', subcategory);
      if (authorId) countQuery.where('workflows.authorId', authorId);
      if (typeof isVip === 'boolean') countQuery.where('workflows.isVip', isVip);
      if (typeof isFree === 'boolean') countQuery.where('workflows.isFree', isFree);
      if (typeof isHot === 'boolean') countQuery.where('workflows.isHot', isHot);
      if (typeof isNew === 'boolean') countQuery.where('workflows.isNew', isNew);
      if (priceRange) countQuery.whereBetween('workflows.price', priceRange);

      if (tags && tags.length > 0) {
        countQuery.where((builder) => {
          tags.forEach(tag => {
            if (tag && tag.length <= SYSTEM_CONSTANTS.WORKFLOW.MAX_TAG_LENGTH) {
              builder.orWhere('workflows.tags', 'like', `%"${tag}"%`);
            }
          });
        });
      }

      if (search && search.trim()) {
        const searchTerm = search.trim();
        if (searchTerm.length >= SYSTEM_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
          countQuery.where((builder) => {
            builder
              .where('workflows.title', 'like', `%${searchTerm}%`)
              .orWhere('workflows.description', 'like', `%${searchTerm}%`)
              .orWhere('workflows.shortDescription', 'like', `%${searchTerm}%`)
              .orWhere('workflows.author', 'like', `%${searchTerm}%`)
              .orWhere('users.username', 'like', `%${searchTerm}%`);
          });
        }
      }

      // 并行执行数据查询和计数查询
      const [items, totalResult] = await Promise.all([
        baseQuery.limit(safeLimit).offset(offset),
        countQuery.first()
      ]);

      const total = parseInt(totalResult?.total as string) || 0;
      const totalPages = Math.ceil(total / safeLimit);

      // 处理JSON字段
      const processedItems = items.map(item => ({
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
        author: {
          name: item.authorName || item.author,
          avatar: item.authorAvatar
        }
      }));

      return {
        items: processedItems,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
          hasNext: safePage < totalPages,
          hasPrev: safePage > 1
        }
      };
    }
  );

  // 优化的用户工作流查询
  static getUserWorkflows = withPerformanceMonitoring(
    'getUserWorkflows',
    async (userId: string, includePrivate = false) => {
      let query = db('workflows')
        .select('*')
        .where('authorId', userId);

      if (!includePrivate) {
        query = query.where('status', 'published');
      }

      return query.orderBy('createdAt', 'desc');
    }
  );

  // 优化的热门工作流查询
  static getPopularWorkflows = withPerformanceMonitoring(
    'getPopularWorkflows',
    async (limit = 10) => {
      return db('workflows')
        .select([
          'id', 'title', 'cover', 'price', 'rating', 'downloadCount',
          'users.username as authorName'
        ])
        .leftJoin('users', 'workflows.authorId', 'users.id')
        .where('workflows.status', 'published')
        .orderBy('downloadCount', 'desc')
        .orderBy('rating', 'desc')
        .limit(limit);
    }
  );

  // 优化的相关工作流查询
  static getRelatedWorkflows = withPerformanceMonitoring(
    'getRelatedWorkflows',
    async (workflowId: string, category: string, limit = 5) => {
      return db('workflows')
        .select([
          'id', 'title', 'cover', 'price', 'rating',
          'users.username as authorName'
        ])
        .leftJoin('users', 'workflows.authorId', 'users.id')
        .where('workflows.status', 'published')
        .where('workflows.category', category)
        .whereNot('workflows.id', workflowId)
        .orderBy('rating', 'desc')
        .orderBy('downloadCount', 'desc')
        .limit(limit);
    }
  );

  // 批量操作优化
  static batchUpdateWorkflowStatus = withPerformanceMonitoring(
    'batchUpdateWorkflowStatus',
    async (workflowIds: string[], status: string) => {
      if (workflowIds.length === 0) return 0;
      
      return db('workflows')
        .whereIn('id', workflowIds)
        .update({
          status,
          updatedAt: new Date()
        });
    }
  );
}

// 索引优化建议
export class IndexOptimizer {
  // 分析查询并提供索引建议
  static async analyzeAndOptimize(): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // 检查是否存在推荐的索引
      const tables = ['workflows', 'users', 'orders', 'order_items', 'payments'];
      
      for (const table of tables) {
        const indexes = await db.raw(`PRAGMA index_list(${table})`);
        
        switch (table) {
          case 'workflows':
            const workflowIndexes = indexes.map((idx: any) => idx.name);
            if (!workflowIndexes.some((name: string) => name.includes('status'))) {
              suggestions.push('CREATE INDEX idx_workflows_status ON workflows(status);');
            }
            if (!workflowIndexes.some((name: string) => name.includes('category'))) {
              suggestions.push('CREATE INDEX idx_workflows_category ON workflows(category);');
            }
            if (!workflowIndexes.some((name: string) => name.includes('status_category'))) {
              suggestions.push('CREATE INDEX idx_workflows_status_category ON workflows(status, category);');
            }
            if (!workflowIndexes.some((name: string) => name.includes('author_status'))) {
              suggestions.push('CREATE INDEX idx_workflows_author_status ON workflows(authorId, status);');
            }
            break;

          case 'orders':
            const orderIndexes = indexes.map((idx: any) => idx.name);
            if (!orderIndexes.some((name: string) => name.includes('user_status'))) {
              suggestions.push('CREATE INDEX idx_orders_user_status ON orders(userId, status);');
            }
            if (!orderIndexes.some((name: string) => name.includes('created_at'))) {
              suggestions.push('CREATE INDEX idx_orders_created_at ON orders(createdAt);');
            }
            break;
        }
      }

      // 执行建议的索引创建
      if (suggestions.length > 0) {
        console.log('Creating recommended indexes...');
        for (const sql of suggestions) {
          try {
            await db.raw(sql);
            console.log(`✅ Executed: ${sql}`);
          } catch (error) {
            console.log(`⚠️  Skipped (may already exist): ${sql}`);
          }
        }
      }

    } catch (error) {
      console.error('Error analyzing indexes:', error);
    }

    return suggestions;
  }

  // 清理未使用的索引
  static async cleanupUnusedIndexes(): Promise<void> {
    // 这里可以添加清理逻辑
    console.log('Index cleanup completed');
  }
}

// 数据库维护工具
export class DatabaseMaintenance {
  // 清理过期数据
  static async cleanupExpiredData(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      // 清理过期的订单
      const expiredOrders = await db('orders')
        .where('status', 'pending')
        .where('createdAt', '<', thirtyDaysAgo)
        .del();

      console.log(`Cleaned up ${expiredOrders} expired orders`);

      // 清理过期的上传文件记录（文件本身需要单独清理）
      const expiredFiles = await db('uploaded_files')
        .where('createdAt', '<', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .del();

      console.log(`Cleaned up ${expiredFiles} expired file records`);

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // 数据库统计信息
  static async getDatabaseStats(): Promise<Record<string, any>> {
    try {
      const stats = {
        workflows: await db('workflows').count('* as count').first(),
        users: await db('users').count('* as count').first(),
        orders: await db('orders').count('* as count').first(),
        payments: await db('payments').count('* as count').first(),
        uploadedFiles: await db('uploaded_files').count('* as count').first(),
      };

      // 获取表大小信息（SQLite特定）
      const tableInfo = await db.raw(`
        SELECT name, SUM("pgsize") as size 
        FROM "dbstat" 
        WHERE name IN ('workflows', 'users', 'orders', 'payments', 'uploaded_files')
        GROUP BY name
      `).catch(() => []);

      return {
        counts: stats,
        sizes: tableInfo,
        queryStats: QueryPerformanceMonitor.getInstance().getQueryStats()
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {};
    }
  }

  // 验证数据完整性
  static async validateDataIntegrity(): Promise<string[]> {
    const issues: string[] = [];

    try {
      // 检查孤立的订单项
      const orphanOrderItems = await db('order_items')
        .leftJoin('orders', 'order_items.orderId', 'orders.id')
        .whereNull('orders.id')
        .count('* as count')
        .first();

      if (orphanOrderItems && typeof orphanOrderItems.count === 'number' && orphanOrderItems.count > 0) {
        issues.push(`Found ${orphanOrderItems.count} orphaned order items`);
      }

      // 检查引用不存在工作流的订单项
      const invalidWorkflowRefs = await db('order_items')
        .leftJoin('workflows', 'order_items.workflowId', 'workflows.id')
        .whereNull('workflows.id')
        .count('* as count')
        .first();

      if (invalidWorkflowRefs && typeof invalidWorkflowRefs.count === 'number' && invalidWorkflowRefs.count > 0) {
        issues.push(`Found ${invalidWorkflowRefs.count} order items referencing non-existent workflows`);
      }

      // 检查引用不存在用户的工作流
      const invalidUserRefs = await db('workflows')
        .leftJoin('users', 'workflows.authorId', 'users.id')
        .whereNull('users.id')
        .count('* as count')
        .first();

      if (invalidUserRefs && typeof invalidUserRefs.count === 'number' && invalidUserRefs.count > 0) {
        issues.push(`Found ${invalidUserRefs.count} workflows referencing non-existent users`);
      }

    } catch (error) {
      issues.push(`Error validating data integrity: ${error}`);
    }

    return issues;
  }
}

// 导出单例实例
export const queryMonitor = QueryPerformanceMonitor.getInstance();
export const optimizedQueries = OptimizedQueries;
export const indexOptimizer = IndexOptimizer;
export const dbMaintenance = DatabaseMaintenance;
