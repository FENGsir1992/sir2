// 管理员API客户端 - 动态获取后端地址

function normalizeAdminBaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (url === '') return '/api/admin';
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (!url.endsWith('/api/admin')) {
    // 如果只有 /api 结尾，则替换为 /api/admin；否则追加 /api/admin
    if (url.endsWith('/api')) {
      url = `${url}/admin`;
    } else {
      url = `${url}/api/admin`;
    }
  }
  return url;
}

const getAdminApiBaseUrl = (): string => {
  // 从环境变量获取后端地址
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (apiBaseUrl) {
    return normalizeAdminBaseUrl(apiBaseUrl);
  }
  // 开发环境使用相对路径
  if ((import.meta as any).env?.DEV) {
    return '/api/admin';
  }
  // 生产环境使用相对路径
  return '/api/admin';
};

const ADMIN_API_BASE_URL = getAdminApiBaseUrl();

// 获取存储的token - 增强版
function getToken(): string | null {
  try {
    const sessionData = localStorage.getItem('wz.auth.session.v1');
    console.log('管理员API - localStorage数据:', sessionData);
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      const token = session?.token;
      if (typeof token === 'string' && token.trim() !== '') {
        return token.trim();
      }
      console.warn('管理员API - session.token 无效，尝试备份token');
    }

    // 回退：尝试读取备份token
    const backup = localStorage.getItem('wz.auth.token.backup');
    if (backup && backup.trim() !== '') {
      console.log('管理员API - 使用备份token');
      return backup.trim();
    }

    console.log('管理员API - 没有找到有效token');
    return null;
  } catch (error) {
    console.error('管理员API - 获取token失败:', error);
    return null;
  }
}

// 基于 XMLHttpRequest 的上传工具，支持上传进度回调
function xhrUpload(
  url: string,
  formData: FormData,
  token: string,
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && typeof onProgress === 'function') {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            try { onProgress({ loaded: event.loaded, total: event.total, percent }); } catch {}
          }
        };
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          const status = xhr.status;
          let data: any = undefined;
          try {
            data = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
          } catch (e) {
            // 忽略解析失败，交由状态码处理
          }
          if (status >= 200 && status < 300) {
            resolve(data ?? { success: true });
          } else {
            const msg = (data && (data.error || data.message)) || `HTTP ${status}`;
            reject(new Error(msg));
          }
        }
      };

      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.onabort = () => reject(new Error('请求已中断'));
      xhr.send(formData);
    } catch (err) {
      reject(err);
    }
  });
}

// 通用管理员API请求函数
async function adminApiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retry = false
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const url = `${ADMIN_API_BASE_URL}${endpoint}`;
  let token = getToken();

  if (!token) {
    throw new Error('需要管理员权限');
  }

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    console.log(`发送管理员API请求: ${url}`, config);
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : undefined;
    console.log(`管理员API响应 ${endpoint}:`, response.status, data);

    if (!response.ok) {
      // 401: 尝试刷新token并重试一次
      if (response.status === 401 && !retry) {
        try {
          const { authApi } = await import('./api-client');
          const refresh = await authApi.refreshToken();
          if (refresh.success && refresh.data?.token) {
            // 更新本地存储的token
            const sessionStr = localStorage.getItem('wz.auth.session.v1');
            if (sessionStr) {
              const session = JSON.parse(sessionStr);
              session.token = refresh.data.token;
              localStorage.setItem('wz.auth.session.v1', JSON.stringify(session));
              localStorage.setItem('wz.auth.token.backup', refresh.data.token);
            } else {
              localStorage.setItem('wz.auth.session.v1', JSON.stringify({ token: refresh.data.token }));
              localStorage.setItem('wz.auth.token.backup', refresh.data.token);
            }
            // 递归重试一次
            return adminApiRequest<T>(endpoint, options, true);
          }
        } catch (e) {
          console.warn('管理员API - 刷新token失败:', e);
        }
      }
      const errMsg = (data as any)?.error || (data as any)?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    return (data as any) ?? { success: true };
  } catch (error) {
    console.error(`管理员API请求失败 ${endpoint}:`, error);
    throw error;
  }
}


// 媒体文件管理API
export const adminMediaApi = {
  // 上传预览视频
  uploadPreviewVideo: async (
    file: File,
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void
  ) => {
    const formData = new FormData();
    formData.append('video', file);

    const token = getToken();
    if (!token) {
      throw new Error('需要管理员权限');
    }

    const url = `${ADMIN_API_BASE_URL}/media/video/preview`;
    // 若提供进度回调，则使用XHR；否则回退为fetch
    if (typeof onProgress === 'function') {
      return xhrUpload(url, formData, token, onProgress);
    }
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
    return data;
  },

  // 上传附件压缩包/通用文件（保存到 backend/uploads/files）
  uploadAttachmentFile: async (
    file: File,
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    if (!token) {
      throw new Error('需要管理员权限');
    }

    const url = `${ADMIN_API_BASE_URL}/media/file/attachment`;
    if (typeof onProgress === 'function') {
      return xhrUpload(url, formData, token, onProgress);
    }
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
    return data;
  },

  // 上传演示视频
  uploadDemoVideo: async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);

    const token = getToken();
    if (!token) {
      throw new Error('需要管理员权限');
    }

    const url = `${ADMIN_API_BASE_URL}/media/video/demo`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }
    return data;
  },

  // 上传封面图片
  uploadCoverImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const token = getToken();
    if (!token) {
      throw new Error('需要管理员权限');
    }

    const url = `${ADMIN_API_BASE_URL}/media/image/cover`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }
    return data;
  },

  // 上传画廊图片（多图）
  uploadGalleryImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const token = getToken();
    if (!token) {
      throw new Error('需要管理员权限');
    }

    const url = `${ADMIN_API_BASE_URL}/media/image/gallery`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }
    return data;
  },

  // 获取媒体文件列表
  getFiles: async (params: {
    page?: number;
    limit?: number;
    type?: 'video' | 'image' | 'file';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return adminApiRequest(`/media/files${queryString ? `?${queryString}` : ''}`);
  },

  // 获取文件详情
  getFile: async (id: string) => {
    return adminApiRequest(`/media/files/${id}`);
  },

  // 删除文件
  deleteFile: async (id: string) => {
    return adminApiRequest(`/media/files/${id}`, {
      method: 'DELETE',
    });
  },
};

// 工作流管理（管理员）
export const adminWorkflowsApi = {
  // 列表
  list: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tags?: string;
    status?: string;
    isVip?: boolean;
    isFree?: boolean;
    isHot?: boolean;
    isNew?: boolean;
    priceRange?: string;
    authorId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const qs = queryParams.toString();
    return adminApiRequest(`/workflows${qs ? `?${qs}` : ''}`);
  },

  // 详情
  get: async (id: string) => {
    return adminApiRequest(`/workflows/${id}`);
  },

  // 创建
  create: async (data: any) => {
    return adminApiRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 更新
  update: async (id: string, data: any) => {
    return adminApiRequest(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除（软删）
  remove: async (id: string) => {
    return adminApiRequest(`/workflows/${id}`, {
      method: 'DELETE',
    });
  },

  // 复制（深拷贝媒体与附件）
  duplicate: async (id: string) => {
    return adminApiRequest(`/workflows/${id}/duplicate`, {
      method: 'POST',
    });
  },
};


