/**
 * 前端性能监控工具
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'navigation' | 'resource' | 'custom' | 'api';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // 监控导航性能
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric('DOM Content Loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'navigation');
              this.recordMetric('Load Complete', navEntry.loadEventEnd - navEntry.loadEventStart, 'navigation');
              this.recordMetric('DNS Lookup', navEntry.domainLookupEnd - navEntry.domainLookupStart, 'navigation');
              this.recordMetric('TCP Connection', navEntry.connectEnd - navEntry.connectStart, 'navigation');
              this.recordMetric('Request Time', navEntry.responseEnd - navEntry.requestStart, 'navigation');
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn('Navigation performance observer not supported:', e);
      }

      // 监控资源加载性能
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.recordMetric(`Resource: ${entry.name}`, entry.duration, 'resource');
              
              // 监控大资源
              if (entry.duration > 1000) {
                console.warn(`Slow resource loading detected: ${entry.name} took ${entry.duration}ms`);
              }
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource performance observer not supported:', e);
      }

      // 监控长任务
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'longtask') {
              console.warn(`Long task detected: ${entry.duration}ms`, entry);
              this.recordMetric('Long Task', entry.duration, 'custom');
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.warn('Long task observer not supported:', e);
      }
    }
  }

  // 记录性能指标
  recordMetric(name: string, value: number, category: PerformanceMetric['category'] = 'custom') {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category
    };
    this.metrics.push(metric);

    // 限制存储的指标数量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  // 测量函数执行时间
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    this.recordMetric(name, end - start, 'custom');
    return result;
  }

  // 测量异步函数执行时间
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    this.recordMetric(name, end - start, 'custom');
    return result;
  }

  // 测量API请求时间
  measureApiCall(url: string, method: string = 'GET'): { start: () => void; end: () => void } {
    let startTime: number;
    
    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(`API: ${method} ${url}`, duration, 'api');
        
        // 警告慢请求
        if (duration > 3000) {
          console.warn(`Slow API request detected: ${method} ${url} took ${duration}ms`);
        }
      }
    };
  }

  // 获取性能报告
  getPerformanceReport(): {
    summary: Record<string, { avg: number; max: number; min: number; count: number }>;
    recentMetrics: PerformanceMetric[];
    slowOperations: PerformanceMetric[];
  } {
    const summary: Record<string, { avg: number; max: number; min: number; count: number }> = {};
    
    // 按名称分组统计
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, max: 0, min: Infinity, count: 0 };
      }
      
      const stat = summary[metric.name];
      stat.max = Math.max(stat.max, metric.value);
      stat.min = Math.min(stat.min, metric.value);
      stat.count++;
      stat.avg = (stat.avg * (stat.count - 1) + metric.value) / stat.count;
    });

    // 获取最近的指标
    const recentMetrics = this.metrics.slice(-50);

    // 获取慢操作
    const slowOperations = this.metrics.filter(metric => metric.value > 1000);

    return { summary, recentMetrics, slowOperations };
  }

  // 监控内存使用
  getMemoryInfo(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  // 获取核心Web指标
  getCoreWebVitals(): Promise<Record<string, number>> {
    return new Promise((resolve) => {
      const vitals: Record<string, number> = {};

      // First Contentful Paint
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP observer not supported');
      }

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            vitals.LCP = entry.startTime;
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              vitals.CLS = clsValue;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            vitals.FID = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // 等待一段时间收集指标
      setTimeout(() => resolve(vitals), 5000);
    });
  }

  // 清理观察者
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // 导出性能数据
  exportData(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metrics: this.metrics,
      memory: this.getMemoryInfo(),
      report: this.getPerformanceReport()
    }, null, 2);
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor();

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const measureRender = (componentName: string) => {
    return performanceMonitor.measureFunction(`Render: ${componentName}`, () => {
      // 这里可以添加渲染性能测量逻辑
    });
  };

  const measureEffect = (effectName: string, fn: () => void) => {
    return performanceMonitor.measureFunction(`Effect: ${effectName}`, fn);
  };

  return {
    measureRender,
    measureEffect,
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    getReport: performanceMonitor.getPerformanceReport.bind(performanceMonitor)
  };
}

// 自动性能监控装饰器
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  return ((...args: Parameters<T>) => {
    const functionName = name || fn.name || 'anonymous';
    return performanceMonitor.measureFunction(functionName, () => fn(...args));
  }) as T;
}

// 页面性能监控
export function trackPagePerformance(pageName: string) {
  const startTime = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(`Page: ${pageName}`, duration, 'navigation');
    }
  };
}

export default performanceMonitor;
