/**
 * 前端缓存管理器
 * 支持内存缓存、localStorage缓存和sessionStorage缓存
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
  version?: string;
}

interface CacheConfig {
  defaultTTL: number; // 默认过期时间（毫秒）
  maxSize: number; // 最大缓存项数
  storage: 'memory' | 'localStorage' | 'sessionStorage';
  version?: string; // 缓存版本，用于缓存失效
}

class CacheManager<T = any> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private config: CacheConfig;
  private storageKey: string;

  constructor(namespace: string, config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5分钟
      maxSize: 100,
      storage: 'memory',
      version: '1.0.0',
      ...config
    };
    this.storageKey = `cache_${namespace}`;
    this.loadFromStorage();
    this.startCleanupTimer();
  }

  // 设置缓存
  set(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.config.defaultTTL);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry,
      version: this.config.version
    };

    this.cache.set(key, item);
    this.enforceMaxSize();
    this.saveToStorage();
  }

  // 获取缓存
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查版本
    if (item.version !== this.config.version) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    // 检查过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return item.data;
  }

  // 检查是否存在且未过期
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // 删除缓存
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  // 获取缓存大小
  size(): number {
    return this.cache.size;
  }

  // 获取所有键
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 获取缓存统计
  getStats(): {
    size: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
    oldestItem?: { key: string; age: number };
    newestItem?: { key: string; age: number };
  } {
    type ItemInfo = { key: string; timestamp: number };
    let oldest: ItemInfo | null = null;
    let newest: ItemInfo | null = null;

    this.cache.forEach((item, key) => {
      const itemInfo: ItemInfo = { key, timestamp: item.timestamp };
      if (!oldest || item.timestamp < oldest.timestamp) {
        oldest = itemInfo;
      }
      if (!newest || item.timestamp > newest.timestamp) {
        newest = itemInfo;
      }
    });

    const now = Date.now();
    const oldestItem = oldest ? { key: (oldest as ItemInfo).key, age: now - (oldest as ItemInfo).timestamp } : undefined;
    const newestItem = newest ? { key: (newest as ItemInfo).key, age: now - (newest as ItemInfo).timestamp } : undefined;
    
    return {
      size: this.cache.size,
      hitRate: 0, // 需要在使用时统计
      totalRequests: 0,
      totalHits: 0,
      oldestItem,
      newestItem
    };
  }

  // 批量设置
  setMultiple(items: Array<{ key: string; data: T; ttl?: number }>): void {
    items.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  // 批量获取
  getMultiple(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach(key => {
      result[key] = this.get(key);
    });
    return result;
  }

  // 获取或设置（如果不存在则设置）
  async getOrSet(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  // 强制最大缓存大小
  private enforceMaxSize(): void {
    if (this.cache.size <= this.config.maxSize) {
      return;
    }

    // 删除最旧的项目
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = entries.slice(0, this.cache.size - this.config.maxSize);
    toDelete.forEach(([key]) => {
      this.cache.delete(key);
    });
  }

  // 清理过期项目
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now > item.expiry || item.version !== this.config.version) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (toDelete.length > 0) {
      this.saveToStorage();
    }
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  // 从存储加载
  private loadFromStorage(): void {
    if (this.config.storage === 'memory') {
      return;
    }

    try {
      const storage = this.config.storage === 'localStorage' ? localStorage : sessionStorage;
      const stored = storage.getItem(this.storageKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([key, item]) => {
            this.cache.set(key, item as CacheItem<T>);
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  // 保存到存储
  private saveToStorage(): void {
    if (this.config.storage === 'memory') {
      return;
    }

    try {
      const storage = this.config.storage === 'localStorage' ? localStorage : sessionStorage;
      const data = Object.fromEntries(this.cache);
      storage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }
}

// 创建不同类型的缓存实例
export const apiCache = new CacheManager('api', {
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxSize: 200,
  storage: 'memory',
  version: '1.0.0'
});

export const userCache = new CacheManager('user', {
  defaultTTL: 10 * 60 * 1000, // 10分钟
  maxSize: 50,
  storage: 'localStorage',
  version: '1.0.0'
});

export const workflowCache = new CacheManager('workflow', {
  defaultTTL: 15 * 60 * 1000, // 15分钟
  maxSize: 500,
  storage: 'localStorage',
  version: '1.0.0'
});

export const imageCache = new CacheManager('image', {
  defaultTTL: 60 * 60 * 1000, // 1小时
  maxSize: 100,
  storage: 'localStorage',
  version: '1.0.0'
});

// 缓存装饰器
export function withCache<T extends (...args: any[]) => Promise<any>>(
  cache: CacheManager,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const cacheKey = keyGenerator(...args);
      
      // 尝试从缓存获取
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        console.log(`Cache hit: ${cacheKey}`);
        return cached;
      }

      // 缓存未命中，执行原方法
      console.log(`Cache miss: ${cacheKey}`);
      const result = await method.apply(this, args);
      
      // 存储到缓存
      if (result !== undefined) {
        cache.set(cacheKey, result, ttl);
      }

      return result;
    };
  };
}

// 智能缓存管理器
export class SmartCacheManager {
  private static instance: SmartCacheManager;
  private caches: Map<string, CacheManager> = new Map();
  private hitStats: Map<string, { hits: number; misses: number }> = new Map();

  static getInstance(): SmartCacheManager {
    if (!SmartCacheManager.instance) {
      SmartCacheManager.instance = new SmartCacheManager();
    }
    return SmartCacheManager.instance;
  }

  // 注册缓存
  registerCache(name: string, cache: CacheManager): void {
    this.caches.set(name, cache);
    this.hitStats.set(name, { hits: 0, misses: 0 });
  }

  // 记录缓存命中
  recordHit(cacheName: string): void {
    const stats = this.hitStats.get(cacheName);
    if (stats) {
      stats.hits++;
    }
  }

  // 记录缓存未命中
  recordMiss(cacheName: string): void {
    const stats = this.hitStats.get(cacheName);
    if (stats) {
      stats.misses++;
    }
  }

  // 获取所有缓存统计
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.caches.forEach((cache, name) => {
      const hitStats = this.hitStats.get(name) || { hits: 0, misses: 0 };
      const total = hitStats.hits + hitStats.misses;
      const hitRate = total > 0 ? (hitStats.hits / total) * 100 : 0;

      stats[name] = {
        ...cache.getStats(),
        hitRate: hitRate.toFixed(2) + '%',
        totalRequests: total,
        totalHits: hitStats.hits,
        totalMisses: hitStats.misses
      };
    });

    return stats;
  }

  // 清理所有缓存
  clearAll(): void {
    this.caches.forEach(cache => cache.clear());
    this.hitStats.forEach(stats => {
      stats.hits = 0;
      stats.misses = 0;
    });
  }

  // 预热缓存
  async warmup(operations: Array<{ cache: string; key: string; factory: () => Promise<any> }>): Promise<void> {
    console.log('Starting cache warmup...');
    
    const promises = operations.map(async ({ cache: cacheName, key, factory }) => {
      try {
        const cache = this.caches.get(cacheName);
        if (cache && !cache.has(key)) {
          const data = await factory();
          cache.set(key, data);
          console.log(`Warmed up cache: ${cacheName}:${key}`);
        }
      } catch (error) {
        console.warn(`Failed to warm up cache ${cacheName}:${key}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('Cache warmup completed');
  }
}

// 注册默认缓存
const smartCache = SmartCacheManager.getInstance();
smartCache.registerCache('api', apiCache);
smartCache.registerCache('user', userCache);
smartCache.registerCache('workflow', workflowCache);
smartCache.registerCache('image', imageCache);

// 导出
export { CacheManager };
export default smartCache;
