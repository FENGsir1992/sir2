import NodeCache from 'node-cache';
import { log } from './logger.js';

// 缓存配置
const CACHE_CONFIG = {
  // 默认TTL (10分钟)
  DEFAULT_TTL: 10 * 60,
  // 用户数据缓存 (5分钟)
  USER_TTL: 5 * 60,
  // 工作流数据缓存 (15分钟)
  WORKFLOW_TTL: 15 * 60,
  // 搜索结果缓存 (5分钟)
  SEARCH_TTL: 5 * 60,
  // 统计数据缓存 (30分钟)
  STATS_TTL: 30 * 60,
  // 配置数据缓存 (1小时)
  CONFIG_TTL: 60 * 60
};

// 创建不同类型的缓存实例
class CacheManager {
  private static instance: CacheManager;
  
  // 通用缓存
  public general: NodeCache;
  // 用户数据缓存
  public users: NodeCache;
  // 工作流缓存
  public workflows: NodeCache;
  // 搜索结果缓存
  public search: NodeCache;
  // 统计数据缓存
  public stats: NodeCache;
  // 会话缓存
  public sessions: NodeCache;

  private constructor() {
    // 通用缓存
    this.general = new NodeCache({
      stdTTL: CACHE_CONFIG.DEFAULT_TTL,
      checkperiod: 120, // 每2分钟检查过期
      useClones: false // 提高性能
    });

    // 用户数据缓存
    this.users = new NodeCache({
      stdTTL: CACHE_CONFIG.USER_TTL,
      checkperiod: 60,
      useClones: false
    });

    // 工作流缓存
    this.workflows = new NodeCache({
      stdTTL: CACHE_CONFIG.WORKFLOW_TTL,
      checkperiod: 180,
      useClones: false
    });

    // 搜索结果缓存
    this.search = new NodeCache({
      stdTTL: CACHE_CONFIG.SEARCH_TTL,
      checkperiod: 60,
      useClones: false
    });

    // 统计数据缓存
    this.stats = new NodeCache({
      stdTTL: CACHE_CONFIG.STATS_TTL,
      checkperiod: 300,
      useClones: false
    });

    // 会话缓存
    this.sessions = new NodeCache({
      stdTTL: 24 * 60 * 60, // 24小时
      checkperiod: 3600, // 每小时检查
      useClones: false
    });

    // 设置事件监听器
    this.setupEventListeners();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private setupEventListeners() {
    // 缓存命中/未命中统计
    const caches = [
      { name: 'general', cache: this.general },
      { name: 'users', cache: this.users },
      { name: 'workflows', cache: this.workflows },
      { name: 'search', cache: this.search },
      { name: 'stats', cache: this.stats },
      { name: 'sessions', cache: this.sessions }
    ];

    caches.forEach(({ name, cache }) => {
      cache.on('set', (key, value) => {
        log.debug(`缓存设置: ${name}:${key}`);
      });

      cache.on('del', (key, value) => {
        log.debug(`缓存删除: ${name}:${key}`);
      });

      cache.on('expired', (key, value) => {
        log.debug(`缓存过期: ${name}:${key}`);
      });
    });
  }

  // 获取缓存统计信息
  public getStats() {
    return {
      general: this.general.getStats(),
      users: this.users.getStats(),
      workflows: this.workflows.getStats(),
      search: this.search.getStats(),
      stats: this.stats.getStats(),
      sessions: this.sessions.getStats()
    };
  }

  // 清空所有缓存
  public flushAll() {
    this.general.flushAll();
    this.users.flushAll();
    this.workflows.flushAll();
    this.search.flushAll();
    this.stats.flushAll();
    this.sessions.flushAll();
    log.info('所有缓存已清空');
  }

  // 清空特定类型的缓存
  public flushCache(type: 'general' | 'users' | 'workflows' | 'search' | 'stats' | 'sessions') {
    this[type].flushAll();
    log.info(`${type}缓存已清空`);
  }
}

// 导出单例实例
export const cache = CacheManager.getInstance();

// 缓存装饰器函数
export function withCache<T extends (...args: any[]) => Promise<any>>(
  cacheType: 'general' | 'users' | 'workflows' | 'search' | 'stats' | 'sessions',
  keyGenerator: (...args: any[]) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);
      const cacheInstance = cache[cacheType];

      // 尝试从缓存获取
      const cachedResult = cacheInstance.get(cacheKey);
      if (cachedResult !== undefined) {
        log.debug(`缓存命中: ${cacheType}:${cacheKey}`);
        return cachedResult;
      }

      // 缓存未命中，执行原方法
      log.debug(`缓存未命中: ${cacheType}:${cacheKey}`);
      const result = await method.apply(this, args);

      // 存储到缓存
      if (result !== undefined && ttl !== undefined) {
        cacheInstance.set(cacheKey, result, ttl);
      } else if (result !== undefined) {
        cacheInstance.set(cacheKey, result);
      }

      return result;
    };
  };
}

// 便捷的缓存操作函数
export const cacheHelper = {
  // 用户相关缓存
  user: {
    get: (userId: string) => cache.users.get(`user:${userId}`),
    set: (userId: string, userData: any, ttl?: number) => 
      cache.users.set(`user:${userId}`, userData, ttl || CACHE_CONFIG.USER_TTL),
    del: (userId: string) => cache.users.del(`user:${userId}`),
    
    // 用户权限缓存
    getPermissions: (userId: string) => cache.users.get(`permissions:${userId}`),
    setPermissions: (userId: string, permissions: any, ttl?: number) =>
      cache.users.set(`permissions:${userId}`, permissions, ttl || CACHE_CONFIG.USER_TTL)
  },

  // 工作流相关缓存
  workflow: {
    get: (workflowId: string) => cache.workflows.get(`workflow:${workflowId}`),
    set: (workflowId: string, workflowData: any, ttl?: number) =>
      cache.workflows.set(`workflow:${workflowId}`, workflowData, ttl || CACHE_CONFIG.WORKFLOW_TTL),
    del: (workflowId: string) => cache.workflows.del(`workflow:${workflowId}`),
    
    // 工作流列表缓存
    getList: (cacheKey: string) => cache.workflows.get(`list:${cacheKey}`),
    setList: (cacheKey: string, listData: any, ttl?: number) =>
      cache.workflows.set(`list:${cacheKey}`, listData, ttl || CACHE_CONFIG.WORKFLOW_TTL)
  },

  // 搜索结果缓存
  search: {
    get: (query: string, filters: any) => {
      const key = `search:${query}:${JSON.stringify(filters)}`;
      return cache.search.get(key);
    },
    set: (query: string, filters: any, results: any, ttl?: number) => {
      const key = `search:${query}:${JSON.stringify(filters)}`;
      return cache.search.set(key, results, ttl || CACHE_CONFIG.SEARCH_TTL);
    }
  },

  // 统计数据缓存
  stats: {
    get: (statType: string) => cache.stats.get(`stats:${statType}`),
    set: (statType: string, statData: any, ttl?: number) =>
      cache.stats.set(`stats:${statType}`, statData, ttl || CACHE_CONFIG.STATS_TTL)
  },

  // 会话缓存
  session: {
    get: (sessionId: string) => cache.sessions.get(`session:${sessionId}`),
    set: (sessionId: string, sessionData: any, ttl?: number) =>
      cache.sessions.set(`session:${sessionId}`, sessionData, ttl || 24 * 60 * 60),
    del: (sessionId: string) => cache.sessions.del(`session:${sessionId}`)
  }
};

// 缓存预热函数
export async function warmupCache() {
  log.info('开始缓存预热...');
  
  try {
    // 这里可以预加载一些常用数据到缓存
    // 例如：热门工作流、用户权限配置等
    
    log.info('缓存预热完成');
    return true;
  } catch (error) {
    log.error('缓存预热失败', { error: (error as Error).message });
    return false;
  }
}

export default cache;
