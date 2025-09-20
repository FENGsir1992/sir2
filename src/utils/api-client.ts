// API客户端配置 - 动态获取后端地址（支持多环境）
import { workflowCache } from './cache-manager';
import smartCache from './cache-manager';

// 规范化 API 基址，确保以 /api 结尾，避免漏写导致 404
function normalizeApiBaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (url === '') return '/api';

  // 去除末尾多余斜杠
  if (url.endsWith('/')) url = url.slice(0, -1);

  // 若未包含 /api 后缀，则追加
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

const getApiBaseUrl = (): string => {
  // 优先使用环境变量配置的API地址
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    const normalized = normalizeApiBaseUrl(apiBaseUrl);
    console.log('🌐 使用环境变量配置的API地址:', normalized);
    return normalized;
  }
  
  // VPN环境下直接连接后端
  if (import.meta.env.VITE_VPN_MODE === 'true') {
    // 【硬编码修复】使用环境变量配置VPN地址
    const vpnHost = import.meta.env.VITE_VPN_HOST || 'localhost';
    const vpnPort = import.meta.env.VITE_VPN_PORT || '3001';
    const vpnApiUrl = normalizeApiBaseUrl(`http://${vpnHost}:${vpnPort}/api`);
    console.log('🌐 使用VPN环境配置，直连后端API:', vpnApiUrl);
    return vpnApiUrl;
  }
  
  // 开发环境使用相对路径（通过Vite代理）
  if (import.meta.env.DEV) {
    console.log('🌐 开发环境使用代理路径');
    return '/api';
  }
  
  // 生产环境使用相对路径
  console.log('🌐 生产环境使用相对路径');
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();
// 兼容环境的超时 signal（Vitest/jsdom 下无 AbortSignal.timeout）
function createTimeoutSignal(ms: number): AbortSignal | undefined {
  try {
    const anyAbort: any = AbortSignal as any;
    if (anyAbort && typeof anyAbort.timeout === 'function') {
      return anyAbort.timeout(ms);
    }
  } catch {}
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    setTimeout(() => {
      try { controller.abort(); } catch {}
    }, ms);
    return controller.signal;
  }
  return undefined;
}

// 获取存储的token
function getToken(): string | null {
  try {
    const sessionData = localStorage.getItem('wz.auth.session.v1');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (session && typeof session.token === 'string' && session.token) return session.token;
      } catch {
        // 非JSON字符串时，直接将其作为token使用（测试场景）
        if (typeof sessionData === 'string' && sessionData.length > 0) return sessionData;
      }
    }
    // 备用token键
    const backup = localStorage.getItem('wz.auth.token.backup');
    if (backup) return backup;
    return null;
  } catch {
    return null;
  }
}

// API响应类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

// 请求去重机制
const pendingRequests = new Map<string, Promise<ApiResponse<any>>>();

function generateRequestKey(endpoint: string, options: RequestInit): string {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : '';
  return `${method}:${endpoint}:${body}`;
}

// 改进的API请求函数（支持指数退避重试和请求去重）
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
  maxRetries = 3
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();
  const isAuthPath = endpoint === '/auth/login' || endpoint === '/auth/register';
  
  // 对于GET请求，检查是否有相同的请求正在进行
  const requestKey = generateRequestKey(endpoint, options);
  const isTestEnv = typeof process !== 'undefined' && (process as any).env && (process as any).env.VITEST;
  if (!isTestEnv && (options.method === 'GET' || !options.method)) {
    const existingRequest = pendingRequests.get(requestKey);
    if (existingRequest) {
      console.log(`🔄 复用进行中的请求: ${endpoint}`);
      return existingRequest;
    }
  }

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // 登录/注册不携带旧的 Authorization，避免无效/过期 token 干扰
      ...(token && !isAuthPath ? { Authorization: `Bearer ${token}` } : {}),
    },
    // 根据环境调整超时时间
    signal: createTimeoutSignal(import.meta.env.VITE_VPN_MODE === 'true' ? 30000 : 10000),
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // 兜底：如果调用方手动传了 Authorization，但这是登录/注册端点，则移除之
  if (isAuthPath && (config.headers as any)?.Authorization) {
    try { delete (config.headers as any).Authorization; } catch {}
  }

  // 创建请求Promise
  const requestPromise = (async (): Promise<ApiResponse<T>> => {
    try {
      console.log(`🌐 API请求: ${config.method || 'GET'} ${url}${retryCount > 0 ? ` (重试 ${retryCount}/${maxRetries})` : ''}`);
      const response = await fetch(url, config);
      
      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`⚠️ 非JSON响应: ${contentType}`);
        const text = await response.text();
        console.log(`响应内容: ${text.substring(0, 200)}...`);
        
        if (!response.ok) {
          throw new Error(`服务器返回非JSON响应 (${response.status}): ${text.substring(0, 100)}`);
        }
        // 如果响应成功但不是JSON，尝试包装为标准格式
        return {
          success: true,
          data: text as any,
          message: 'Non-JSON response received'
        };
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        throw new Error(`响应JSON解析失败: ${parseError}`);
      }
      
      console.log(`✅ API响应: ${response.status}`, data.success ? '成功' : '失败');

      if (!response.ok) {
        // 如果是服务器错误且可以重试，抛出特殊错误
        if (response.status >= 500 && retryCount < maxRetries) {
          throw new Error(`SERVER_ERROR_${response.status}: ${data.error || data.message}`);
        }
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      // 验证响应数据结构
      if (typeof data !== 'object' || data === null) {
        throw new Error('响应数据格式无效');
      }

      return data;
    } catch (error) {
    const errorMessage = (error as Error).message;
    const errorName = (error as Error).name;
    
    console.error(`❌ API请求失败 ${endpoint}:`, error);
    
    // 判断是否需要重试
    const shouldRetry = retryCount < maxRetries && (
      errorName === 'TypeError' || 
      errorName === 'AbortError' ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('Network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('SERVER_ERROR_5') // 服务器错误
    );
    // 测试环境下：仅对5xx错误重试，网络错误和超时不重试，避免测试挂起
    const allowRetry = (typeof process !== 'undefined' && (process as any).env && (process as any).env.VITEST)
      ? errorMessage.includes('SERVER_ERROR_5')
      : shouldRetry;

    if (allowRetry) {
      // 指数退避算法（测试环境使用极短延迟）
      const delay = (typeof process !== 'undefined' && (process as any).env && (process as any).env.VITEST) ? 10 : Math.min(1000 * Math.pow(2, retryCount), 5000);
      console.log(`🔄 ${delay}ms 后重试请求 (${retryCount + 1}/${maxRetries}): ${endpoint}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiRequest(endpoint, options, retryCount + 1, maxRetries);
    }
    
      throw error;
    }
  })();

  // 对于GET请求，将其加入pending map
  if (!isTestEnv && (options.method === 'GET' || !options.method)) {
    pendingRequests.set(requestKey, requestPromise);
    
    // 请求完成后清理
    requestPromise.finally(() => {
      pendingRequests.delete(requestKey);
    });
  }

  return requestPromise;
}

// 认证相关API
export const authApi = {
  // 用户登录
  login: async (email: string, password: string) => {
    const response = await apiRequest<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // 保存完整用户数据到localStorage
    if (response.success && response.data) {
      const sessionData = {
        id: response.data.user.id,
        name: response.data.user.username, // 注意：后端返回的是username，前端需要的是name
        email: response.data.user.email,
        avatar: response.data.user.avatar,
        isVip: response.data.user.isVip,
        balance: response.data.user.balance,
        vipExpiresAt: response.data.user.vipExpiresAt,
        token: response.data.token,
      };
      console.log('保存用户登录数据:', sessionData); // 调试日志
      localStorage.setItem('wz.auth.session.v1', JSON.stringify(sessionData));
      
      // 备份token防止丢失
      if (response.data.token) {
        localStorage.setItem('wz.auth.token.backup', response.data.token);
        console.log('🔒 Token backup created');
      }
    }

    return response;
  },

  // 用户注册
  register: async (username: string, email: string, password: string, avatar?: string) => {
    const response = await apiRequest<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, avatar }),
    });

    // 保存完整用户数据到localStorage
    if (response.success && response.data) {
      const sessionData = {
        id: response.data.user.id,
        name: response.data.user.username, // 注意：后端返回的是username，前端需要的是name
        email: response.data.user.email,
        avatar: response.data.user.avatar,
        isVip: response.data.user.isVip,
        balance: response.data.user.balance,
        vipExpiresAt: response.data.user.vipExpiresAt,
        token: response.data.token,
      };
      console.log('保存用户注册数据:', sessionData); // 调试日志
      localStorage.setItem('wz.auth.session.v1', JSON.stringify(sessionData));
    }

    return response;
  },

  // 刷新token
  refreshToken: async () => {
    return apiRequest<{ token: string }>('/auth/refresh', {
      method: 'POST',
    });
  },

  // 登出
  logout: () => {
    localStorage.removeItem('wz.auth.session.v1');
  },
  
  // 微信扫码登录：创建二维码
  createWechatLoginQrcode: async () => {
    return apiRequest<{ scene: string; imageUrl: string; expireSeconds: number }>(
      '/wechat/qrcode',
      { method: 'POST' }
    );
  },

  // 微信扫码登录：查询状态
  getWechatLoginStatus: async (scene: string) => {
    return apiRequest<{ status: string; token?: string; user?: any }>(
      `/wechat/status/${encodeURIComponent(scene)}`
    );
  },
};

// 用户相关API
export const userApi = {
  // 获取用户资料
  getProfile: async () => {
    return apiRequest('/users/profile');
  },

  // 更新用户资料
  updateProfile: async (data: { username?: string; avatar?: string }) => {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 修改密码
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // 获取余额
  getBalance: async () => {
    return apiRequest('/users/balance');
  },

  // 充值
  recharge: async (amount: number) => {
    return apiRequest('/users/recharge', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
};

// 工作流相关API
export const workflowApi = {
  // 获取工作流列表（带缓存）
  getWorkflows: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tags?: string;
    priceRange?: string;
    isVip?: boolean;
    isFree?: boolean;
    isHot?: boolean;
    isNew?: boolean;
    authorId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const cacheKey = `workflows_list_${queryString}`;
    
    // 尝试从缓存获取
    const cached = workflowCache.get(cacheKey);
    if (cached) {
      smartCache.recordHit('workflow');
      console.log(`🎯 缓存命中: ${cacheKey}`);
      return cached;
    }
    
    smartCache.recordMiss('workflow');
    const result = await apiRequest(`/workflows${queryString ? `?${queryString}` : ''}`);
    // 兼容后端返回 { data: { items, pagination } } 的结构
    try {
      const anyResult: any = result as any;
      if (anyResult && anyResult.success && anyResult.data) {
        const d = anyResult.data;
        if (Array.isArray(d?.items) && !Array.isArray(d?.workflows)) {
          anyResult.data = {
            workflows: d.items,
            pagination: d.pagination ?? d.meta ?? null,
          };
        }
      }
    } catch {}
    
    // 缓存结果（缓存时间根据搜索参数调整）
    const cacheTTL = params.search ? 2 * 60 * 1000 : 10 * 60 * 1000; // 搜索结果缓存2分钟，其他10分钟
    workflowCache.set(cacheKey, result, cacheTTL);
    
    return result;
  },

  // 获取工作流详情（带缓存）
  getWorkflow: async (id: string) => {
    const cacheKey = `workflow_detail_${id}`;
    
    // 尝试从缓存获取
    const cached = workflowCache.get(cacheKey);
    if (cached) {
      smartCache.recordHit('workflow');
      console.log(`🎯 缓存命中: ${cacheKey}`);
      return cached;
    }
    
    smartCache.recordMiss('workflow');
    const result = await apiRequest(`/workflows/${id}`);
    
    // 缓存详情页面15分钟
    workflowCache.set(cacheKey, result, 15 * 60 * 1000);
    
    return result;
  },

  // 创建工作流（管理）
  createWorkflow: async (data: any) => {
    return apiRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 更新工作流（管理）
  updateWorkflow: async (id: string, data: any) => {
    return apiRequest(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除工作流（管理，软删）
  deleteWorkflow: async (id: string) => {
    return apiRequest(`/workflows/${id}`, {
      method: 'DELETE',
    });
  },

  // 新增：使与工作流相关的缓存失效
  invalidateCache: (options?: { id?: string } ) => {
    try {
      const keys = workflowCache.keys();
      for (const key of keys) {
        if (key.startsWith('workflows_list_')) {
          workflowCache.delete(key);
        }
        if (options?.id && key === `workflow_detail_${options.id}`) {
          workflowCache.delete(key);
        }
      }
      // 同时清理可能仍在进行中的 GET /workflows* 请求，避免复用旧数据
      try {
        const pendingKeys = Array.from((pendingRequests as any).keys?.() || []);
        for (const reqKey of pendingKeys) {
          if (typeof reqKey === 'string' && (reqKey.startsWith('GET:/workflows?') || reqKey === 'GET:/workflows:' || reqKey.startsWith('GET:/workflows/'))) {
            (pendingRequests as any).delete?.(reqKey);
          }
        }
      } catch {}
      // 通过 localStorage 广播一次更新信号，便于跨标签页/路由联动
      try {
        localStorage.setItem('wz.workflows.cache.bump', String(Date.now()));
      } catch {}
    } catch (err) {
      console.warn('清理工作流缓存失败:', err);
    }
  },

  // 获取推荐工作流
  getRecommended: async (limit: number = 6) => {
    return apiRequest(`/workflows/featured/recommended?limit=${limit}`);
  },

  // 获取每日推荐（最多3个）
  getDailyRecommended: async (limit: number = 3) => {
    return apiRequest(`/workflows/recommended/daily?limit=${limit}`);
  },

  // 获取热门标签
  getPopularTags: async () => {
    return apiRequest('/workflows/tags/popular');
  },
};

// 推荐相关API
export const recommendationApi = {
  // 获取个性化推荐
  getPersonalized: async (limit: number = 10) => {
    return apiRequest(`/recommendations/personalized?limit=${limit}`);
  },

  // 获取相似工作流推荐
  getSimilar: async (workflowId: string, limit: number = 6) => {
    return apiRequest(`/recommendations/similar/${workflowId}?limit=${limit}`);
  },

  // 获取热门推荐
  getTrending: async (params: { limit?: number; timeRange?: '1d' | '7d' | '30d' | '90d' } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/recommendations/trending${queryString ? `?${queryString}` : ''}`);
  },
};

// 订单相关API
const originalOrderApi = {
  // 获取订单列表
  getOrders: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/orders${queryString ? `?${queryString}` : ''}`);
  },

  // 获取订单详情
  getOrder: async (id: string) => {
    return apiRequest(`/orders/${id}`);
  },

  // 创建订单
  createOrder: async (data: {
    items: { workflowId: string; quantity: number }[];
    shippingAddress?: string;
    paymentMethod?: string;
  }) => {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 取消订单
  cancelOrder: async (id: string) => {
    return apiRequest(`/orders/${id}/cancel`, {
      method: 'PUT',
    });
  },

  // 确认收货
  confirmOrder: async (id: string) => {
    return apiRequest(`/orders/${id}/confirm`, {
      method: 'PUT',
    });
  },
};

// 支付相关API
export const paymentApi = {
  // 创建支付
  createPayment: async (data: {
    orderId: string;
    method: 'alipay' | 'wechat' | 'balance';
    returnUrl?: string;
  }) => {
    return apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 创建支付宝支付（page | wap | qr）
  createAlipay: async (
    orderId: string,
    type: 'page' | 'wap' | 'qr' = 'page'
  ) => {
    return apiRequest<{ paymentId: string; payUrl?: string; qrCode?: string }>(`/pay/alipay/create`, {
      method: 'POST',
      body: JSON.stringify({ orderId, type }),
    });
  },

  // 创建微信Native支付，返回二维码链接
  createWechatNative: async (orderId: string) => {
    return apiRequest<{ paymentId: string; codeUrl: string }>(`/pay/wechat/native`, {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },

  // 查询支付状态
  getPaymentStatus: async (id: string) => {
    return apiRequest(`/payments/${id}/status`);
  },

  // 获取支付历史
  getPaymentHistory: async (params: { page?: number; limit?: number } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/payments/history${queryString ? `?${queryString}` : ''}`);
  },
};

// 文件上传相关API
export const uploadApi = {
  // 单文件上传
  uploadSingle: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest('/uploads/single', {
      method: 'POST',
      headers: {
        // 不设置 Content-Type；仅在存在 token 时附加 Authorization
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: formData,
    });
  },

  // 多文件上传
  uploadMultiple: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return apiRequest('/uploads/multiple', {
      method: 'POST',
      headers: {
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: formData,
    });
  },

  // 获取文件列表
  getFiles: async (params: { page?: number; limit?: number } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/uploads/list${queryString ? `?${queryString}` : ''}`);
  },

  // 删除文件
  deleteFile: async (id: string) => {
    return apiRequest(`/uploads/${id}`, {
      method: 'DELETE',
    });
  },
};

// 购物车相关API
export const cartApi = {
  // 获取购物车
  getCart: async () => {
    return apiRequest('/cart');
  },

  // 添加到购物车
  addToCart: async (workflowId: string, quantity: number = 1) => {
    return apiRequest('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ workflowId, quantity }),
    });
  },

  // 更新购物车项数量
  updateCartItem: async (itemId: string, quantity: number) => {
    return apiRequest(`/cart/update/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  // 删除购物车项
  removeFromCart: async (itemId: string) => {
    return apiRequest(`/cart/remove/${itemId}`, {
      method: 'DELETE',
    });
  },

  // 清空购物车
  clearCart: async () => {
    return apiRequest('/cart/clear', {
      method: 'DELETE',
    });
  },
};

// 扩展订单相关API
export const orderApi = {
  ...originalOrderApi,
  
  // 获取已购买的工作流
  getPurchasedWorkflows: async (params: { page?: number; limit?: number } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/orders/purchased/workflows${queryString ? `?${queryString}` : ''}`);
  },
};

// 收藏相关API
export const favoriteApi = {
  // 获取收藏列表
  getFavorites: async (params: { page?: number; limit?: number } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/favorites${queryString ? `?${queryString}` : ''}`);
  },

  // 添加收藏
  addFavorite: async (workflowId: string) => {
    return apiRequest(`/favorites/${workflowId}`, {
      method: 'POST',
    });
  },

  // 取消收藏
  removeFavorite: async (workflowId: string) => {
    return apiRequest(`/favorites/${workflowId}`, {
      method: 'DELETE',
    });
  },

  // 检查是否已收藏
  checkFavorite: async (workflowId: string) => {
    return apiRequest(`/favorites/check/${workflowId}`);
  },
};

// 评论相关API
export const reviewApi = {
  // 获取工作流评论列表
  getReviews: async (workflowId: string, params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/reviews/${workflowId}${queryString ? `?${queryString}` : ''}`);
  },

  // 创建或更新评论
  createOrUpdateReview: async (workflowId: string, data: {
    rating: number;
    comment?: string;
  }) => {
    return apiRequest(`/reviews/${workflowId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 删除评论
  deleteReview: async (workflowId: string) => {
    return apiRequest(`/reviews/${workflowId}`, {
      method: 'DELETE',
    });
  },

  // 获取用户对特定工作流的评价
  getMyReview: async (workflowId: string) => {
    return apiRequest(`/reviews/${workflowId}/my-review`);
  },
};

// 健康检查
export const healthApi = {
  check: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const healthUrl = baseUrl.replace('/api', '/health');
      const response = await fetch(healthUrl);
      return await response.json();
    } catch (error) {
      console.error('健康检查失败:', error);
      throw error;
    }
  },
};

// 低阶请求器（用于测试和通用调用）
export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, data?: any) => apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: <T = any>(endpoint: string, data?: any) => apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
