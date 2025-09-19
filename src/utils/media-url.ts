// 统一解析媒体资源URL，兼容开发代理与生产独立资源域

function normalizeBase(base?: string): string | null {
  if (!base) return null;
  let b = base.trim();
  if (b.endsWith('/')) b = b.slice(0, -1);
  return b;
}

export function resolveMediaUrl(input?: string | null): string | undefined {
  if (!input) return undefined;

  // 兼容 Windows 路径：统一将反斜杠转换为正斜杠
  input = input.replace(/\\/g, '/');

  // 统一容错：把以 "uploads/" 开头的路径补上前导斜杠
  if (/^uploads\//i.test(input)) {
    input = '/' + input.replace(/^uploads\//i, 'uploads/');
  }

  // 兼容意外包含 backend/ 前缀的情况
  if (/^\/?.*backend\/(uploads\/.+)/i.test(input)) {
    const m = input.match(/^\/?.*backend\/(uploads\/.+)/i);
    if (m) input = '/' + m[1];
  }

  // 已是绝对URL
  if (/^https?:\/\//i.test(input)) return input;

  // 仅处理以 /uploads 开头的相对路径
  if (input.startsWith('/uploads')) {
    // 开发环境：在 VPN 模式下，直接走后端真实地址，绕过 Vite 代理
    if (import.meta.env.DEV) {
      if ((import.meta as any).env?.VITE_VPN_MODE === 'true') {
        const mediaBaseFromEnv = normalizeBase((import.meta as any).env?.VITE_MEDIA_BASE_URL as any);
        const backendOrigin = normalizeBase((import.meta as any).env?.VITE_BACKEND_ORIGIN as any);
        // 从 VITE_API_BASE_URL 推导出后端 Origin（去掉 /api 路径）
        const apiBaseRaw = (import.meta as any).env?.VITE_API_BASE_URL as any;
        let apiOriginFromBaseUrl: string | null = null;
        if (apiBaseRaw && typeof apiBaseRaw === 'string') {
          try {
            const u = new URL(apiBaseRaw);
            const hasApi = u.pathname.endsWith('/api');
            apiOriginFromBaseUrl = hasApi ? `${u.protocol}//${u.host}` : `${u.protocol}//${u.host}`;
          } catch {}
        }
        // 更稳健的回退：本机开发端口 3001（避免写死内网IP）
        const localDevFallback = normalizeBase('http://localhost:3001');
        const base = mediaBaseFromEnv || backendOrigin || apiOriginFromBaseUrl || localDevFallback;
        if (base) return `${base}${input}`;
      }
      // 非 VPN 模式：走 Vite 代理
      return input;
    }

    // 生产环境：优先使用独立媒体域名
    const mediaBase = normalizeBase(import.meta.env.VITE_MEDIA_BASE_URL as any);
    if (mediaBase) return `${mediaBase}${input}`;

    // VPN/直连后端（当设置了 VITE_BACKEND_ORIGIN 或 VITE_VPN_MODE=true）
    const backendOrigin = normalizeBase((import.meta as any).env?.VITE_BACKEND_ORIGIN as any);
    if (backendOrigin) return `${backendOrigin}${input}`;

    if ((import.meta as any).env?.VITE_VPN_MODE === 'true') {
      // 【硬编码修复】使用环境变量配置VPN地址，避免硬编码内网IP
      const vpnHost = (import.meta as any).env?.VITE_VPN_HOST || 'localhost';
      const vpnPort = (import.meta as any).env?.VITE_VPN_PORT || '3001';
      const vpnBase = normalizeBase(`http://${vpnHost}:${vpnPort}`);
      if (vpnBase) return `${vpnBase}${input}`;
    }

    // 回退到 API_BASE_URL（去掉 /api 后缀）或与当前站点同源
    const apiBase = normalizeBase(import.meta.env.VITE_API_BASE_URL as any);
    if (apiBase) {
      const withoutApi = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
      return `${withoutApi}${input}`;
    }
    try {
      const currentOrigin = window.location.origin;
      return `${currentOrigin}${input}`;
    } catch {}
  }

  // 其他相对路径按原样返回
  return input;
}

export default resolveMediaUrl;




