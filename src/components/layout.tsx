import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Navbar, 
  NavbarContent, 
  NavbarItem, 
  Link, 
  Button,
  Avatar
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useUser } from "../contexts/AppContext";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { useCart } from "../hooks/useCart";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  // 移除未使用的 totalItems 以通过构建
  useCart();
  
  // 启用键盘导航增强
  useKeyboardNavigation();
  

  const menuItems = [
    { key: "/", label: "首页", icon: "solar:home-2-bold-duotone" },
    { key: "/store", label: "工作流商店", icon: "solar:widget-5-bold-duotone" },
    { key: "/membership", label: "会员开通", icon: "solar:crown-bold-duotone" },
  ];

  return (
    <div className="h-screen bg-transparent flex flex-col overflow-hidden">
      {/* 跳过链接 - 辅助功能 */}
      <a href="#main-content" className="skip-link">
        跳转到主要内容
      </a>
      
      <Navbar isBordered className="bg-white/80 backdrop-blur-md px-0" classNames={{
        wrapper: "w-full max-w-full px-2 sm:pl-7 sm:pr-4"
      }}>
        <NavbarContent justify="start" className="gap-4">
          {/* Brand Logo */}
          <NavbarItem className="mr-[84px]">
            <div className="tech-border-box">
              <div className="tech-border-box-inner flex items-center px-2 py-1">
                <Icon icon="solar:widget-5-bold-duotone" className="text-3xl text-primary" />
                <div className="ml-2 relative">
                  <div className="sci-fi-text">
                    <span className="sci-fi-char">即</span>
                    <span className="sci-fi-char">刻</span>
                    <span className="sci-fi-char sci-fi-highlight">A</span>
                    <span className="sci-fi-char sci-fi-highlight">I</span>
                  </div>
                  <div className="flowing-light"></div>
                </div>
              </div>
            </div>
          </NavbarItem>

          {/* Navigation Buttons - 桌面端显示 */}
          {menuItems.map((item) => (
            <NavbarItem key={item.key} isActive={location.pathname === item.key} className="hidden sm:flex">
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.key);
                }}
                className={`nav-chip ${location.pathname === item.key ? 'active' : ''}`}
              >
                <div className="nav-chip-inner">
                  <Icon icon={item.icon} className="text-base" />
                  <span>{item.label}</span>
                </div>
              </Link>
            </NavbarItem>
          ))}

          {/* Navigation Buttons - 移动端显示简化版 */}
          {menuItems.map((item) => (
            <NavbarItem key={`mobile-${item.key}`} isActive={location.pathname === item.key} className="flex sm:hidden">
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.key);
                }}
                className={`nav-chip ${location.pathname === item.key ? 'active' : ''}`}
              >
                <div className="nav-chip-inner px-2">
                  <Icon icon={item.icon} className="text-sm" />
                </div>
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>

        <NavbarContent justify="end" className="pr-[23px]">
          {user.isLoggedIn && (
            <>
              <NavbarItem>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/user");
                  }}
                  className={`nav-chip ${location.pathname === "/user" ? 'active' : ''}`}
                >
                  <div className="nav-chip-inner">
                    <Icon icon="solar:user-bold-duotone" className="text-base" />
                    <span>个人中心</span>
                  </div>
                </Link>
              </NavbarItem>
            </>
          )}
          <NavbarItem>
            {user.isLoggedIn ? (
              <Avatar
                isBordered
                className="nav-chip"
                color="primary"
                name={user.name || "用户"}
                size="sm"
                radius="lg"
                src={user.avatar || `https://api.dicebear.com/7.x/lorelei/svg?seed=${user.name || 'user'}&backgroundColor=065f46,047857,059669,0891b2,1e40af&hair=variant01,variant02,variant03,variant04&hairColor=0f172a,374151,6b7280,d1d5db&eyes=variant01,variant02,variant03&eyebrows=variant01,variant02&mouth=happy01,happy02,happy03&nose=variant01,variant02`}
              />
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="light"
                  onClick={() => navigate("/login")}
                >
                  登录
                </Button>
                <Button
                  color="primary"
                  onClick={() => navigate("/register")}
                >
                  注册
                </Button>
              </div>
            )}
          </NavbarItem>
        </NavbarContent>
      </Navbar>


      <main 
        id="main-content" 
        className={`flex-1 min-h-0 ${
          (location.pathname === '/user' || location.pathname.startsWith('/user/'))
            ? 'w-full pl-[220px] sm:pl-[250px] pr-4 py-0'
            : location.pathname.startsWith('/workflow/')
              ? 'w-full max-w-7xl mx-auto px-0 py-0'
              : (location.pathname === '/' || location.pathname === '/store' || location.pathname === '/membership')
                ? 'w-full px-0 py-0'
                : 'container mx-auto px-4 py-8 overflow-y-auto'
        }`}
        role="main"
        aria-label="主要内容"
      >
        {children}
      </main>
    </div>
  );
}