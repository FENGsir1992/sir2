import React from "react";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import CanvasParticleBackground from "../components/canvas-particle-background";
import EditableSection from "../components/EditableSection";
import { useDailyRecommendedWorkflows } from "../hooks/useWorkflows";
import { StoreCard } from "./workflow-store-page";

// 优化：使用 React.memo 包装组件
const HomePage = React.memo(() => {
  const navigate = useNavigate();
  const { workflows: dailyWorkflows, loading: dailyLoading, error: dailyError } = useDailyRecommendedWorkflows(3);
  const dailyCards = React.useMemo(() => [0,1,2].map((i) => dailyWorkflows[i] || null), [dailyWorkflows]);
  const goStoreTop = () => {
    navigate('/store');
    // 强制滚动到新页面顶部
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };
  return (
    <div className="flex-1 w-full relative h-full overflow-y-auto">
      {/* 1) Hero Section - 工作流商店全新上线 */}
      <EditableSection page="home" section="hero">
      <section className="relative overflow-hidden min-h-screen">
        {/* 色相流动背景 */}
        <div className="hue-flow-bg pointer-events-none" />
        
        {/* Canvas 粒子背景（仅作用于 Hero 区域） */}
        <CanvasParticleBackground variant="absolute" />
        
        {/* 涟漪波纹特效 */}
        <div className="ripple-container">
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="ripple"></div>
        </div>
        
        {/* 金色流光特效 */}
        <div className="gold-flow" />
        
        {/* 半透明叠加层，让内容更清晰 */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        
        {/* 增强的动态渐变横竖条特效 */}
        <div className="enhanced-bars absolute inset-0 z-10 pointer-events-none">
          <span className="bar-h" style={{ top: '15%' }} />
          <span className="bar-h" style={{ top: '45%', animationDelay: '2s' }} />
          <span className="bar-h" style={{ top: '75%', animationDelay: '4s' }} />
          <span className="bar-v" style={{ left: '25%' }} />
          <span className="bar-v" style={{ left: '55%', animationDelay: '3s' }} />
          <span className="bar-v" style={{ left: '80%', animationDelay: '6s' }} />
        </div>
        
        {/* 粒子光点增强（减少一半） */}
        <div className="absolute inset-0">
          <div className="particle-glow" style={{ top: '10%', left: '20%' }} />
          <div className="particle-glow" style={{ top: '30%', right: '15%', animationDelay: '1s' }} />
          <div className="particle-glow" style={{ bottom: '20%', left: '10%', animationDelay: '2s' }} />
        </div>
        
        {/* 对标装饰图标元素（改为静态定位/样式） */}
        <div className="text-yellow-300/60 animate-float" style={{ position: 'absolute', left: 64, top: 64 }}>
          <Icon icon="lucide:shopping-cart" className="w-6 h-6" />
        </div>
        <div className="text-cyan-300/60 animate-float" style={{ position: 'absolute', left: 'calc(100vw - 200px)', top: 128 }}>
          <Icon icon="lucide:star" className="w-5 h-5" />
        </div>
        <div className="text-pink-300/60 animate-float" style={{ position: 'absolute', left: '33vw', top: 192 }}>
          <Icon icon="lucide:diamond" className="w-4 h-4" />
        </div>
        <div className="text-green-300/60 animate-float" style={{ position: 'absolute', left: 'calc(100vw - 160px)', top: 'calc(100vh - 240px)' }}>
          <Icon icon="lucide:zap" className="w-6 h-6" />
        </div>
        <div className="text-orange-300/60 animate-float" style={{ position: 'absolute', left: 80, top: 'calc(100vh - 260px)' }}>
          <Icon icon="lucide:gift" className="w-5 h-5" />
        </div>
        <div className="text-blue-300/60 animate-float" style={{ position: 'absolute', left: '75vw', top: 256 }}>
          <Icon icon="lucide:heart" className="w-4 h-4" />
        </div>
        <div className="text-purple-300/60 animate-float" style={{ position: 'absolute', left: '50vw', top: 320 }}>
          <Icon icon="lucide:sparkles" className="w-5 h-5" />
        </div>
        <div className="text-teal-300/60 animate-float" style={{ position: 'absolute', left: '66vw', top: 'calc(100vh - 300px)' }}>
          <Icon icon="lucide:crown" className="w-6 h-6" />
        </div>
        
        <div className="relative max-w-7xl mx-auto pr-6 py-20 md:py-24 pl-[14px] home-hero-shift">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* 左侧文案 */}
            <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              <div className="flex items-center gap-2 px-5 py-1.5 rounded-md bg-gradient-to-r from-cyan-400 to-cyan-500 text-white text-base font-extrabold shadow-lg mb-8 animate-pulse hover:scale-105 transition-transform duration-300 glow-chip w-full">
                <Icon icon="lucide:sparkles" className="animate-spin" style={{animationDuration: '2s'}} />
                <span className="font-black !font-black" style={{fontWeight: 900}}>全新上线</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] animate-fade-in-up mb-4" style={{animationDelay: '0.4s'}}>
                工作流商店全新上线
              </h1>
              <p className="text-xl md:text-2xl font-medium text-cyan-300 animate-fade-in-up mb-8" style={{animationDelay: '0.6s'}}>
                开启AI创作新模式！
              </p>

              {/* 亮点列表 */}
              <div className="mt-8 space-y-4">
                <a className="group flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 hover:bg-white/20 hover:border-white/30 transition-all duration-300 animate-fade-in-left" style={{animationDelay: '0.8s'}} href="#">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icon icon="lucide:shopping-cart" className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">工作流支持单个购买，按需付费更灵活</p>
                  </div>
                  <Icon icon="lucide:chevron-right" className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 w-5 h-5" />
                </a>
                <a className="group flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 hover:bg-white/20 hover:border-white/30 transition-all duration-300 animate-fade-in-left" style={{animationDelay: '1.2s'}} href="#">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icon icon="lucide:download" className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">下单即解锁工作流压缩包，快速导入立刻使用</p>
                  </div>
                  <Icon icon="lucide:chevron-right" className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 w-5 h-5" />
                </a>
              </div>

              {/* SVIP 提示卡 */}
              <div className="mt-8 rounded-2xl border border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 backdrop-blur-md p-6 animate-fade-in-up hover:scale-105 transition-all duration-300" style={{animationDelay: '1.4s'}}>
                <div className="flex items-center gap-2 text-yellow-300 font-semibold text-lg mb-4">
                  <Icon icon="lucide:crown" className="animate-pulse text-yellow-400 w-5 h-5" /> SVIP核心权益不变
                </div>
                <ul className="text-white/90 space-y-3 text-base">
                  <li className="flex items-start gap-3 hover:translate-x-1 transition-transform duration-200">
                    <Icon icon="lucide:check-circle2" className="mt-0.5 text-green-400 w-5 h-5 flex-shrink-0"/> 
                    官方自研工作流持续免费
                  </li>
                  <li className="flex items-start gap-3 hover:translate-x-1 transition-transform duration-200">
                    <Icon icon="lucide:check-circle2" className="mt-0.5 text-green-400 w-5 h-5 flex-shrink-0"/> 
                    创作者上架智能体可享最高五折优惠
                  </li>
                </ul>
              </div>

              <div className="mt-16 animate-fade-in-up" style={{animationDelay: '1.6s'}}>
                <button 
                  type="button"
                  className="btn-streaming-light text-sm font-medium relative z-10"
                  onClick={goStoreTop}
                >
                  立即前往
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 右侧卡片三角形布局 */}
            <div className="relative h-[420px] hidden md:block animate-fade-in-right" style={{animationDelay: '0.8s', left: '100px', top: '60px'}}>
              {/* AI智能体 - 顶部中心 */}
              <div className="absolute left-1/2 transform -translate-x-1/2 top-4 wobble-a">
                <div className="w-40 h-40 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-blue-500/90 text-white flex items-center justify-center mb-2 shadow-lg">
                      <Icon icon="lucide:bot" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">AI智能体</p>
                  </div>
                </div>
              </div>
              {/* 视频工作流 - 左下角 */}
              <div className="absolute left-4 bottom-8 wobble-b">
                <div className="w-44 h-44 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-500/90 text-white flex items-center justify-center mb-2 shadow-lg">
                      <Icon icon="lucide:video" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">视频工作流</p>
                  </div>
                </div>
              </div>
              {/* 统计卡片 - 右下角 */}
              <div className="absolute right-4 bottom-8 wobble-c">
                <div className="w-48 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-500 text-white flex items-center justify-center">
                      <Icon icon="lucide:users" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800">10k+ 用户</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500 text-white flex items-center justify-center">
                      <Icon icon="lucide:workflow" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800">500+ 工作流</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </EditableSection>

      {/* 2) 每日推荐工作流 */}
      <EditableSection page="home" section="daily-recommend">
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 daily-stretch-30">
          <div className="flex items-center justify-center gap-3 mb-3 animate-fade-in-up">
            <Icon icon="lucide:flame" className="text-orange-500 animate-pulse text-xl" />
            <p className="text-xl sm:text-2xl font-semibold text-orange-600 leading-snug sm:leading-tight">每日推荐工作流</p>
          </div>
          <p className="text-gray-500 mb-8 animate-fade-in-up text-center" style={{animationDelay: '0.2s'}}>精选优质智能体，提升您的AI创作效率</p>
          
          {dailyError && (
            <div className="text-red-500 text-center mb-4">
              获取每日推荐失败: {dailyError}
            </div>
          )}
          
          {dailyLoading && (
            <div className="text-center mb-4">
              <Icon icon="lucide:loader-2" className="animate-spin text-2xl text-gray-500" />
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {dailyCards.map((wf, idx) => (
              wf ? (
                <StoreCard key={`daily-${idx}`} workflow={wf as any} />
              ) : (
                <Card key={`daily-${idx}`} shadow="sm" className="overflow-hidden w-full animate-fade-in-up" style={{animationDelay: `${0.5 + idx * 0.1}s`}}>
                  <div className="bg-gray-200 rounded-lg aspect-[16/9]" />
                  <CardBody className="p-2">
                    <div className="h-6 bg-gray-200 rounded mb-2" />
                    <div className="h-6 bg-gray-100 rounded" />
                  </CardBody>
                </Card>
              )
            ))}
            {/* 🌟 CTA卡片 - 获取更多优质工作流 */}
            <EditableSection page="home" section="daily-cta" className="w-full">
            <Card data-testid="daily-cta-card" className="relative w-full bg-gradient-to-br from-purple-500 via-purple-400 to-pink-400 text-white hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 animate-fade-in-up overflow-hidden group" style={{animationDelay: '0.7s'}}>
              {/* 背景光晕效果 */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/15 via-transparent to-pink-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* 流光效果 */}
              <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              {/* 动态光点 */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/50 rounded-full animate-sparkle"></div>
              <div className="absolute top-8 right-8 w-1 h-1 bg-white/70 rounded-full animate-pulse delay-300"></div>
              <div className="absolute top-12 right-6 w-1.5 h-1.5 bg-pink-200/60 rounded-full animate-ping delay-500"></div>
              
              {/* 边框光效 */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              
              {/* 微妙的内阴影 */}
              <div className="absolute inset-0 rounded-lg shadow-inner opacity-30"></div>
              
              <CardBody className="p-6 flex flex-col justify-between relative z-10 min-h-[280px]">
                <div>
                  <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center mb-3 hover:rotate-12 hover:bg-white/35 hover:scale-110 transition-all duration-300 shadow-lg animate-float">
                    <Icon icon="lucide:rocket" className="animate-pulse text-lg" />
                  </div>
                  <p className="text-xl font-semibold bg-gradient-to-r from-white via-white to-white/95 bg-clip-text text-transparent">获取更多优质工作流</p>
                  <p className="text-white/95 mt-2 text-sm font-medium drop-shadow-sm">探索无限可能，开启AI创作新体验</p>
                </div>
                <Button className="bg-white/95 backdrop-blur-sm text-purple-700 font-bold mt-6 self-start hover:scale-110 hover:shadow-xl hover:bg-white hover:text-purple-800 transition-all duration-300 border border-white/30 shadow-lg" size="sm" onClick={goStoreTop}>
                  立即前往 →
                </Button>
              </CardBody>
            </Card>
            </EditableSection>
          </div>
        </div>
      </section>
      </EditableSection>

      {/* 3) 剪映小助手 */}
      <EditableSection page="home" section="jianying-helper">
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center daily-stretch-30">
          <div className="animate-fade-in-left">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 hover:text-violet-600 transition-colors duration-300 leading-snug md:leading-tight">剪映小助手</h3>
            <p className="mt-4 text-gray-600 leading-7 animate-fade-in-left" style={{animationDelay: '0.2s'}}>
              一键将AI生成的视频内容导入剪映，快速完成剪辑与合成，支持本地草稿与云端MP4。
              智能化一键生成剪映草稿，与本地剪映无缝对接，让创作效率倍增。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 animate-fade-in-left" style={{animationDelay: '0.4s'}}>
              <Chip color="secondary" variant="flat" className="hover:scale-110 transition-transform duration-200">极速导入</Chip>
              <Chip color="secondary" variant="flat" className="hover:scale-110 transition-transform duration-200">智能合成</Chip>
              <Chip color="secondary" variant="flat" className="hover:scale-110 transition-transform duration-200">云端渲染</Chip>
            </div>
            <Button className="mt-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:scale-110 hover:shadow-xl hover:from-violet-700 hover:to-fuchsia-700 transition-all duration-300 animate-fade-in-left" style={{animationDelay: '0.6s'}} onClick={goStoreTop}>前往下载 →</Button>
          </div>
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 aspect-[16/9] hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in-right" />
        </div>
      </section>
      </EditableSection>

      {/* 4) 海量插件 */}
      <EditableSection page="home" section="plugins">
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center daily-stretch-30">
          <div className="order-2 md:order-1 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 aspect-[16/9] hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in-left" />
          <div className="order-1 md:order-2 animate-fade-in-right">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 hover:text-violet-600 transition-colors duration-300 leading-snug md:leading-tight">海量插件</h3>
            <p className="mt-4 text-gray-600 leading-7 animate-fade-in-right" style={{animationDelay: '0.2s'}}>
              提供丰富多样的高效能插件，包含视频合成、视频转音频、全平台视频下载、图片视频、声音克隆、获取第三方平台数据等插件。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 animate-fade-in-right" style={{animationDelay: '0.4s'}}>
              <Chip color="secondary" variant="flat" className="hover:scale-110 transition-transform duration-200">视频合成</Chip>
              <Chip color="secondary" variant="flat" className="hover:scale-110 transition-transform duration-200">声音克隆</Chip>
              <Chip color="secondary" variant="flat" className="hover:scale-110 transition-transform duration-200">平台数据获取</Chip>
            </div>
            <Button className="mt-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:scale-110 hover:shadow-xl hover:from-violet-700 hover:to-fuchsia-700 transition-all duration-300 animate-fade-in-right" style={{animationDelay: '0.6s'}}>前往查看 →</Button>
          </div>
        </div>
      </section>
      </EditableSection>


      {/* 6) 海量插件和工作流 网格 */}
      <EditableSection page="home" section="grid">
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 daily-stretch-30">
          <div className="text-center mb-10">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 animate-fade-in-up leading-snug md:leading-tight">海量插件和工作流</h3>
            <p className="text-gray-500 mt-2 animate-fade-in-up" style={{animationDelay: '0.2s'}}>200+核心插件，1000+工作流，满足企业级Agent的调用</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {React.useMemo(() => [
              {id: 1, icon:"lucide:play-circle", title:"视频合成", desc:"视频素材、图片素材合成，支持BGM、配音、转场等"},
              {id: 2, icon:"lucide:audio-lines", title:"视频转音频", desc:"提取视频音频，支持多种格式"},
              {id: 3, icon:"lucide:image", title:"图生视频", desc:"豆包、海螺、vidu、万相等"},
              {id: 4, icon:"lucide:cc", title:"字幕音频对齐", desc:"智能同步字幕与音频，精准对齐时间轴"},
              {id: 5, icon:"lucide:mic", title:"声音克隆", desc:"生成属于你的专属声音"},
              {id: 6, icon:"lucide:search", title:"视频搜索", desc:"抖音、快手、小红书、B站等平台"},
              {id: 7, icon:"lucide:download", title:"视频全平台下载", desc:"轻松获取创作素材"},
              {id: 8, icon:"lucide:database", title:"获取第三方平台数据", desc:"淘宝、京东、拼多多等平台数据"},
            ], []).map((f) => (
              <Card key={f.id} className="hover:shadow-md hover:scale-105 hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: `${0.4 + f.id * 0.1}s`}}>
                <CardBody className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white flex items-center justify-center hover:rotate-12 hover:scale-110 transition-all duration-300">
                    <Icon icon={f.icon} className="hover:animate-pulse" />
                  </div>
                  <p className="mt-4 font-normal text-gray-900 hover:text-fuchsia-600 transition-colors duration-200">{f.title}</p>
                  <p className="mt-1 text-sm text-gray-500 leading-6 hover:text-gray-700 transition-colors duration-200">{f.desc}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
      </EditableSection>

      {/* 7) 大数字统计：按需移除 */}

      {/* 8) 页脚公司信息 */}
      <EditableSection page="home" section="footer">
      <footer className="py-14 text-gray-600 bg-white">
        <div className="max-w-7xl mx-auto px-6 home-hero-shift">
          <p className="text-xl font-bold mb-6 animate-fade-in-up hover:text-gray-800 transition-colors duration-300">极芮AIGC</p>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 animate-fade-in-up hover:text-gray-800 transition-colors duration-200" style={{animationDelay: '0.2s'}}><Icon icon="lucide:map-pin" className="hover:animate-pulse"/> 极芮科技</p>
            <p className="flex items-center gap-2 animate-fade-in-up hover:text-gray-800 transition-colors duration-200" style={{animationDelay: '0.4s'}}><Icon icon="lucide:phone" className="hover:animate-pulse"/> xxxxxxxxxxx：</p>
          </div>
          <p className="mt-8 text-xs text-gray-500 animate-fade-in-up hover:text-gray-700 transition-colors duration-200" style={{animationDelay: '0.6s'}}>© 2025  版权所有</p>
        </div>
      </footer>
      </EditableSection>
    </div>
  );
});

HomePage.displayName = 'HomePage';

export default HomePage;
