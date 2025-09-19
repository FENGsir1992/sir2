import {defineConfig, loadEnv} from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vitePluginInjectDataLocator from "./plugins/vite-plugin-inject-data-locator";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const BACKEND = env.VITE_BACKEND_ORIGIN || 'http://localhost:3001';
  const VPN = env.VITE_VPN_MODE === 'true';

  return {
    plugins: [react(), vitePluginInjectDataLocator(), tailwindcss()],
    server: {
      host: true, // 允许外部访问
      // 忽略后端数据库/上传目录导致的频繁变更，避免 Vite 热重载风暴
      watch: {
        ignored: [
          '**/backend/data/**',
          '**/backend/uploads/**',
          '**/*.sqlite',
          '**/*.sqlite-journal',
          '**/*.sqlite-shm',
          '**/*.sqlite-wal'
        ]
      },
      proxy: {
        '/api': {
          target: BACKEND, // 可通过环境变量覆盖
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('🔴 代理错误:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('🔄 代理请求:', req.method, req.url, '-> ', options.target + proxyReq.path);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('✅ 代理响应:', proxyRes.statusCode, req.url);
            });
          },
          timeout: 120000, // 提升API超时时间以适应支付回调/慢网
          proxyTimeout: 120000
        },
        // VPN 模式下不代理 /uploads，直接由前端代码指向后端真实地址，避免大文件代理断开
        ...(VPN ? {} : {
          '/uploads': {
            target: BACKEND,
            changeOrigin: true,
            secure: false,
            timeout: 300000, // 大文件上传读超时 5 分钟
            proxyTimeout: 300000
          }
        })
      }
    }
  };
});