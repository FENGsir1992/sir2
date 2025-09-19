import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout";
import HomePage from "./pages/home-page";
import FontCheckBadge from "./components/font-check-badge";

// 懒加载组件 - 优化初始加载性能
import {
  LazyWorkflowStorePage,
  LazyWorkflowDetailPage,
  LazyProfilePage,
  LazyMigrationPage,
  LazyLoginPage,
  LazyRegisterPage,
  LazyUserCenterPage,
  LazyCheckoutPage,
  LazyOrderPage,
  LazyWechatNativePayPage,
  LazyAlipayPage,
  LazyAlipayResultPage,
  LazyMembershipPage,
  LazyRechargePage,
  LazyCartPage,
  useSmartPreloading,
  LazyWorkflowAdminPage,
} from "./components/LazyComponents";

export default function App() {
  // 启用智能预加载
  useSmartPreloading();
  
  return (
    <main className="text-foreground bg-background">
      <Layout>
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/store" element={<LazyWorkflowStorePage />} />
            <Route path="/workflow/:id" element={<LazyWorkflowDetailPage />} />
            <Route path="/profile" element={<LazyProfilePage />} />
            <Route path="/migration" element={<LazyMigrationPage />} />
            <Route path="/membership" element={<LazyMembershipPage />} />
            
            {/* 用户相关路由 */}
            <Route path="/login" element={<LazyLoginPage />} />
            <Route path="/register" element={<LazyRegisterPage />} />
            <Route path="/user" element={<LazyUserCenterPage />} />
            <Route path="/user/recharge" element={<LazyRechargePage />} />
            
            {/* 购物和支付相关路由 */}
            <Route path="/cart" element={<LazyCartPage />} />
            <Route path="/checkout" element={<LazyCheckoutPage />} />
            <Route path="/orders" element={<LazyOrderPage />} />
            <Route path="/orders/:id" element={<LazyOrderPage />} />
            <Route path="/pay/wechat/native" element={<LazyWechatNativePayPage />} />
            <Route path="/pay/alipay" element={<LazyAlipayPage />} />
            <Route path="/payment/alipay/return" element={<LazyAlipayResultPage />} />

            {/* 管理路由 */}
            <Route path="/admin/workflows" element={<LazyWorkflowAdminPage />} />
            
        </Routes>
      </Layout>
      {(import.meta.env.DEV || String(import.meta.env.VITE_SHOW_FONT_BADGE) === "true") && <FontCheckBadge />}
    </main>
  );
}