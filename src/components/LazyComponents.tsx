/**
 * 懒加载组件定义
 * 用于代码分割和性能优化
 */

import React, { Suspense } from 'react';
import { Spinner } from '@heroui/react';

// 加载状态组件
const LoadingSpinner = ({ message = "加载中..." }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" color="primary" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// 错误边界组件
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-500 mb-2">组件加载失败</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 懒加载包装器（不转发 ref，避免类型不匹配）
const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) => {
  const LazyWrapped = (props: P) => (
    <LazyLoadErrorBoundary>
      <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
        <Component {...props} />
      </Suspense>
    </LazyLoadErrorBoundary>
  );
  return LazyWrapped;
};

// 懒加载页面组件
export const LazyWorkflowStorePage = withLazyLoading(
  React.lazy(() => import('../pages/workflow-store-page')),
  "加载工作流商店..."
);

export const LazyWorkflowDetailPage = withLazyLoading(
  React.lazy(() => import('../pages/workflow-detail-page')),
  "加载工作流详情..."
);

export const LazyUserCenterPage = withLazyLoading(
  React.lazy(() => import('../pages/user/user-center-page')),
  "加载用户中心..."
);

export const LazyLoginPage = withLazyLoading(
  React.lazy(() => import('../pages/user/login-page')),
  "加载登录页面..."
);

export const LazyRegisterPage = withLazyLoading(
  React.lazy(() => import('../pages/user/register-page')),
  "加载注册页面..."
);

export const LazyMembershipPage = withLazyLoading(
  React.lazy(() => import('../pages/user/membership-page')),
  "加载会员页面..."
);

export const LazyRechargePage = withLazyLoading(
  React.lazy(() => import('../pages/user/recharge-page')),
  "加载充值页面..."
);

export const LazyCartPage = withLazyLoading(
  React.lazy(() => import('../pages/shop/cart-page')),
  "加载购物车..."
);

export const LazyCheckoutPage = withLazyLoading(
  React.lazy(() => import('../pages/payment/checkout-page')),
  "加载结算页面..."
);

export const LazyOrderPage = withLazyLoading(
  React.lazy(() => import('../pages/payment/order-page')),
  "加载订单页面..."
);

export const LazyWechatNativePayPage = withLazyLoading(
  React.lazy(() => import('../pages/payment/wechat-native')),
  "加载微信支付..."
);

export const LazyAlipayPage = withLazyLoading(
  React.lazy(() => import('../pages/payment/alipay-page')),
  "加载支付宝支付..."
);

export const LazyAlipayResultPage = withLazyLoading(
  React.lazy(() => import('../pages/payment/alipay-result')),
  "确认支付结果..."
);

export const LazyWorkflowAdminPage = withLazyLoading(
  React.lazy(() => import('../pages/admin/workflow-admin-page')),
  "加载工作流管理..."
);

export const LazyMigrationPage = withLazyLoading(
  React.lazy(() => import('../pages/migration-page')),
  "加载迁移页面..."
);

export const LazyProfilePage = withLazyLoading(
  React.lazy(() => import('../pages/profile-page')),
  "加载个人资料..."
);

// 懒加载组件
export const LazyCanvasParticleBackground = withLazyLoading(
  React.lazy(() => import('./canvas-particle-background')),
  "加载背景特效..."
);

export const LazyVideoPreviewSection = withLazyLoading(
  React.lazy(() => import('./VideoPreviewSection')),
  "加载视频预览..."
);

export const LazyMigrationForm = withLazyLoading(
  React.lazy(() => import('./migration-form').then(m => ({ default: m.MigrationForm }))),
  "加载迁移表单..."
);

export const LazyMigrationHistory = withLazyLoading(
  React.lazy(() => import('./migration-history').then(m => ({ default: m.MigrationHistory }))),
  "加载迁移历史..."
);

// 导出工具函数
export { withLazyLoading, LoadingSpinner, LazyLoadErrorBoundary };

// 预加载函数
export const preloadComponents = {
  workflowStore: () => import('../pages/workflow-store-page'),
  workflowDetail: () => import('../pages/workflow-detail-page'),
  userCenter: () => import('../pages/user/user-center-page'),
  login: () => import('../pages/user/login-page'),
  register: () => import('../pages/user/register-page'),
  membership: () => import('../pages/user/membership-page'),
  recharge: () => import('../pages/user/recharge-page'),
  checkout: () => import('../pages/payment/checkout-page'),
  order: () => import('../pages/payment/order-page'),
  migration: () => import('../pages/migration-page'),
  profile: () => import('../pages/profile-page'),
  adminWorkflows: () => import('../pages/admin/workflow-admin-page'),
};

// 智能预加载 - 根据用户行为预加载可能需要的组件
export const useSmartPreloading = () => {
  React.useEffect(() => {
    const preloadTimer = setTimeout(() => {
      // 延迟预加载常用页面
      preloadComponents.workflowStore();
      preloadComponents.login();
    }, 2000);

    // 鼠标悬停预加载（使用防抖优化性能）
    let preloadTimeout: NodeJS.Timeout | null = null;
    const handleMouseEnter = (event: MouseEvent) => {
      const rawTarget = event.target as EventTarget | null;
      if (!rawTarget) return;
      // 仅当目标为 Element 时才使用 closest，避免 Document/Text 节点导致报错
      if (!(rawTarget instanceof Element)) return;
      const link = rawTarget.closest('a');
      
      if (link) {
        const href = link.getAttribute('href');
        // 防抖处理，避免频繁触发预加载
        if (preloadTimeout) clearTimeout(preloadTimeout);
        preloadTimeout = setTimeout(() => {
          switch (href) {
            case '/store':
              preloadComponents.workflowStore();
              break;
            case '/login':
              preloadComponents.login();
              break;
            case '/register':
              preloadComponents.register();
              break;
            case '/user':
              preloadComponents.userCenter();
              break;
            case '/membership':
              preloadComponents.membership();
              break;
          }
        }, 100); // 100ms 防抖延迟
      }
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);

    return () => {
      clearTimeout(preloadTimer);
      if (preloadTimeout) clearTimeout(preloadTimeout);
      document.removeEventListener('mouseenter', handleMouseEnter, true);
    };
  }, []);
};
