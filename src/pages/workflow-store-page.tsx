import React from "react";
import { Button, Card, CardBody, Input, Tabs, Tab, Avatar, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import EditableSection from "../components/EditableSection";
import { localMediaStore } from "../utils/local-media-store";
import { useWorkflows } from "../hooks/useWorkflows";
import { WorkflowLoadingGrid } from "../components/WorkflowLoadingCard";
import { WorkflowError } from "../components/WorkflowError";
import { Workflow } from "../types/shared";
import { orderApi } from "../utils/api-client";
import { useFavorite, useFavorites } from "../hooks/useFavorites";
import resolveMediaUrl from "../utils/media-url";
 

// 购买记录Hook
function usePurchaseHistory() {
  const [purchaseHistory, setPurchaseHistory] = React.useState<Workflow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPurchaseHistory = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 获取用户已购买的工作流
      const response = await orderApi.getPurchasedWorkflows();
      if (response.success && response.data) {
        setPurchaseHistory(response.data.workflows || []);
      } else {
        // 如果获取失败，设置空数组而不是抛出错误
        console.warn('获取购买记录失败:', response.error);
        setPurchaseHistory([]);
      }
    } catch (err) {
      console.error('获取购买记录失败:', err);
      setError((err as Error).message || '获取购买记录失败');
      // 设置空数组作为fallback
      setPurchaseHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPurchaseHistory();
  }, [fetchPurchaseHistory]);

  return {
    purchaseHistory,
    loading,
    error,
    refresh: fetchPurchaseHistory
  };
}

function PriceBadge({ price, showVip, isFree }: { price: number; showVip: boolean; isFree: boolean }) {
  const formatPrice = (price: number) => {
    if (isFree) return "免费";
    return `¥${price.toFixed(2)}`;
  };

  return (
    <>
      {showVip && (
        <div className="wz-badge-vip">
          <div className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1 bg-green-600">
            <Icon icon="lucide:gift" className="text-white text-sm" />
            <span>SVIP 限时免费</span>
          </div>
        </div>
      )}
      <div className="wz-badge-price">
        <div className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1 bg-amber-500">
          <Icon icon="lucide:badge-dollar-sign" className="text-white text-sm" />
          <span>{formatPrice(price)}</span>
        </div>
      </div>
    </>
  );
}


export function StoreCard({ workflow, onFavoriteChange }: { workflow: Workflow; onFavoriteChange?: (favorited: boolean) => void }) {
  const navigate = useNavigate();
  const { isFavorited, toggleFavorite, loading: favoriteLoading } = useFavorite(workflow.id);
  // 移除未使用的本地状态，避免构建告警
  const previewUrl = workflow.previewVideo || workflow.demoVideo;
  const [isHover, setIsHover] = React.useState(false);
  const [videoSrc, setVideoSrc] = React.useState<string>("");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showDownloader, setShowDownloader] = React.useState(false);
  // 固定封面比例为 16:9，不再动态计算

  // 旧逻辑保留注释：封面来源统一走 workflow.cover 或默认图
  // const coverSrc = React.useMemo(() => {
  //   if (workflow.cover && String(workflow.cover).trim()) {
  //     return resolveMediaUrl(workflow.cover) || workflow.cover;
  //   }
  //   return "/TX.jpg";
  // }, [workflow.cover]);
  // 新：确保首屏显示封面（没有封面时使用默认占位）
  const coverSrc = React.useMemo(() => {
    const src = (workflow.cover && String(workflow.cover).trim()) ? (resolveMediaUrl(workflow.cover) || workflow.cover) : "/TX.jpg";
    return src || "/TX.jpg";
  }, [workflow.cover]);

  // 备份版本不包含自动缩略图与持久化逻辑

  const handleGetWorkflow = () => {
    // 始终跳转到详情页，避免因存在附件而阻断导航
    navigate(`/workflow/${workflow.id}`);
  };

  const buildNetworkUrl = React.useCallback(() => {
    const base = resolveMediaUrl(previewUrl) || previewUrl || '';
    // 加一个极短的缓存破坏参数，避免后端重启后旧缓存指向不存在的inode
    const antiCache = `__t=${Date.now()}`;
    return base.includes('?') ? `${base}&${antiCache}` : `${base}?${antiCache}`;
  }, [previewUrl]);

  const handleMouseEnter = async () => {
    if (!previewUrl) return;
    setIsHover(true);
    if (!videoSrc) {
      // 优先从本地缓存取预览视频
      const blob = await localMediaStore.getPreviewBlob(String(workflow.id)).catch(() => null);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        setVideoSrc(objectUrl);
      } else {
        const networkUrl = buildNetworkUrl();
        setVideoSrc(networkUrl);
      }
    }
    // 尝试播放（移动端需 muted + playsInline）
    setTimeout(() => {
      try {
        videoRef.current?.play();
      } catch {}
    }, 0);
  };

  const handleVideoError = React.useCallback(() => {
    // 当首次加载失败时，尝试一次强制刷新URL（再次添加时间戳）
    if (!previewUrl) return;
    const retryUrl = buildNetworkUrl();
    if (videoRef.current) {
      videoRef.current.src = retryUrl;
      // 再尝试播放
      setTimeout(() => {
        try { videoRef.current?.play(); } catch {}
      }, 0);
    } else {
      setVideoSrc(retryUrl);
    }
  }, [previewUrl, buildNetworkUrl]);

  const handleMouseLeave = () => {
    setIsHover(false);
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
    // 如果是对象URL，及时释放
    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
      setVideoSrc("");
    }
  };

  

  return (
    <EditableSection page="store" section={`card-${workflow.code ?? workflow.id}`} className="w-full">
    <Card shadow="sm" className={`w-full wz-store-card`} data-workflow-id={workflow.code ?? workflow.id}>
      <div className="wz-store-card__cover">
        <div 
          className={`wz-store-card__cover-inner ${isHover ? 'is-hover' : ''}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleGetWorkflow}
          style={{ cursor: 'pointer' }}
        >
          <img
            src={coverSrc}
            alt={workflow.title}
            className="wz-store-card__img"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            onError={(e) => { try { (e.currentTarget as HTMLImageElement).src = '/TX.jpg'; } catch {} }}
          />
          {previewUrl ? (
            <video
              ref={videoRef}
              className="wz-store-card__video"
              muted
              playsInline
              loop
              preload="none"
              crossOrigin="anonymous"
              poster={resolveMediaUrl(workflow.cover) || workflow.cover}
              src={videoSrc || undefined}
              onLoadedData={() => {
                if (isHover) {
                  try { videoRef.current?.play(); } catch {}
                }
              }}
              onError={handleVideoError}
            />
          ) : null}
        </div>
        <PriceBadge price={workflow.price} showVip={workflow.isVip} isFree={workflow.isFree} />
      </div>
      <CardBody className="flex flex-col gap-2 wz-store-card__body">
        <div className="flex items-start justify-between">
          <div className="wz-store-card__title leading-5">{workflow.title}</div>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className={`bg-transparent self-start mt-[2px] h-7 w-7 min-w-[28px] p-0 ${isFavorited ? 'text-pink-400' : 'text-gray-600'} hover:bg-gray-100`}
            onPress={async (e) => { 
              e?.continuePropagation?.(); 
              const next = !isFavorited; 
              const res = await toggleFavorite(); 
              if (res.success && onFavoriteChange) onFavoriteChange(next);
            }}
            isLoading={favoriteLoading}
            aria-pressed={isFavorited}
          >
            <Icon 
              icon={isFavorited ? "ph:heart-fill" : "ph:heart"} 
              className="text-[18px]" 
            />
          </Button>
        </div>
        <div className="wz-store-card__meta">
          <div className="flex items-center gap-3">
            <Avatar 
              size="sm" 
              src={workflow.authorAvatar || "/TX.jpg"} 
              className="rounded-md" 
            />
            <span className="line-clamp-1 text-sm">{workflow.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="flat"
              color="primary"
              size="sm"
              className="wz-store-card__btn"
              onPress={handleGetWorkflow}
            >
              获取工作流
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
    {/* 附件下载器 */}
    {showDownloader && Array.isArray((workflow as any).attachments) && (
      <Modal isOpen={showDownloader} onOpenChange={setShowDownloader} size="md">
        <ModalContent>
          <ModalHeader>工作流下载</ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              {((workflow as any).attachments as string[]).map((url: string, idx: number) => (
                <a key={`${url}-${idx}`} href={resolveMediaUrl(url) || url} download className="flex items-center justify-between bg-gray-50 rounded border px-3 py-2 hover:bg-gray-100">
                  <span className="text-sm truncate pr-3">附件 {idx + 1}</span>
                  <Button size="sm" color="primary" variant="flat" startContent={<Icon icon="lucide:download" />}>下载</Button>
                </a>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowDownloader(false)}>关闭</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )}
    </EditableSection>
  );
}

function FavoritesContent() {
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const { favorites, loading, error, refresh } = useFavorites();

  const filteredFavorites = React.useMemo(() => {
    const k = searchKeyword.trim().toLowerCase();
    if (!k) return favorites;
    return favorites.filter((item) => `${item.title} ${item.author}`.toLowerCase().includes(k));
  }, [searchKeyword, favorites]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">我的收藏记录</h2>
        </div>
        <WorkflowLoadingGrid count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">我的收藏记录</h2>
        </div>
        <WorkflowError error={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">我的收藏记录</h2>
        <div className="flex w-80 max-w-full">
          <Input
            placeholder="搜索智能体名称或创作者..."
            value={searchKeyword}
            onValueChange={setSearchKeyword}
            className="flex-1"
            classNames={{
              input: "text-sm placeholder:text-gray-400",
              inputWrapper: "h-10 rounded-l-lg rounded-r-none bg-white shadow-sm border border-gray-200"
            }}
          />
          <button className="h-10 px-3 rounded-r-lg bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center shadow-sm">
            <Icon icon="lucide:search" className="text-[18px]" />
          </button>
        </div>
      </div>

      {filteredFavorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFavorites.map((workflow) => (
            <StoreCard key={workflow.id} workflow={workflow} onFavoriteChange={() => refresh()} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:heart" className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">暂无收藏</h3>
            <p className="text-sm text-gray-500 mb-3">将喜欢的工作流点击右上角爱心加入收藏</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseHistoryContent() {
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const { purchaseHistory, loading, error, refresh } = usePurchaseHistory();

  // 过滤购买记录
  const filteredPurchases = React.useMemo(() => {
    const k = searchKeyword.trim().toLowerCase();
    if (!k) return purchaseHistory;
    return purchaseHistory.filter((item) => 
      `${item.title} ${item.author}`.toLowerCase().includes(k)
    );
  }, [searchKeyword, purchaseHistory]);

  // 计算统计数据
  const totalAmount = React.useMemo(() => {
    return purchaseHistory.reduce((sum, item) => {
      return sum + (item.isFree ? 0 : item.price);
    }, 0);
  }, [purchaseHistory]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">我的购买记录</h2>
        </div>
        <WorkflowLoadingGrid count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">我的购买记录</h2>
        </div>
        <WorkflowError error={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 页面标题和搜索 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">我的购买记录</h2>
        <div className="flex w-80 max-w-full">
          <Input
            placeholder="搜索智能体名称或创作者..."
            value={searchKeyword}
            onValueChange={setSearchKeyword}
            className="flex-1"
            classNames={{
              input: "text-sm placeholder:text-gray-400",
              inputWrapper: "h-10 rounded-l-lg rounded-r-none bg-white shadow-sm border border-gray-200"
            }}
          />
          <button className="h-10 px-3 rounded-r-lg bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center shadow-sm">
            <Icon icon="lucide:search" className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 总消费金额 */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Icon icon="lucide:wallet" className="text-white text-lg" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">¥{totalAmount.toFixed(2)}</div>
              <div className="text-xs text-gray-500">总消费金额</div>
            </div>
          </div>
        </div>

        {/* 购买记录数 */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Icon icon="lucide:shopping-cart" className="text-white text-lg" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{purchaseHistory.length}</div>
              <div className="text-xs text-gray-500">购买记录数</div>
            </div>
          </div>
        </div>

        {/* 已购智能体 */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center">
              <Icon icon="lucide:user" className="text-white text-lg" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{purchaseHistory.length}</div>
              <div className="text-xs text-gray-500">已购智能体</div>
            </div>
          </div>
        </div>
      </div>

      {/* 购买记录列表 */}
      {filteredPurchases.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPurchases.map((workflow) => (
            <StoreCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      ) : searchKeyword ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:search" className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">未找到相关记录</h3>
            <p className="text-sm text-gray-500 mb-3">没有找到包含 "{searchKeyword}" 的购买记录</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:shopping-cart" className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">暂无已购买的智能体</h3>
            <p className="text-sm text-gray-500 mb-3">您还没有购买任何智能体，去智能体集合看看吧！</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowStorePage() {
  // 支持通过 URL 参数 `tab=orders` 直接打开“我的购买记录”
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') || 'hot';
  const [tab, setTab] = React.useState(initialTab);
  const [keyword, setKeyword] = React.useState("");
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  // 使用真实API获取工作流数据
  const {
    workflows,
    loading,
    error,
    pagination,
    refresh,
    search,
    filter
  } = useWorkflows({
    search: keyword,
    // 标签过滤
    isHot: tab === "hot" ? true : undefined,
    // SVIP免费：仅根据 isVip 过滤
    isVip: tab === "free" ? true : undefined,
    // 初始排序：火爆按 sortOrder，其余按创建时间
    sortBy: tab === "hot" ? "sortOrder" : "createdAt",
    sortOrder: "desc",
    category: tab !== "hot" && tab !== "free" && tab !== "orders" && tab !== "favorites" ? tab : undefined,
    autoLoad: tab !== "orders" && tab !== "favorites"
  });

  // 备份版：直接使用接口返回的列表

  // 处理搜索
  const handleSearch = React.useCallback((searchQuery: string) => {
    setKeyword(searchQuery);
    search(searchQuery);
  }, [search]);

  // 处理标签切换
  const handleTabChange = React.useCallback((newTab: string) => {
    setTab(newTab);
    setKeyword(""); // 切换标签时清空搜索
    
    if (newTab === "orders" || newTab === "favorites") return; // 购买/收藏记录不需要重新加载工作流
    
    // 根据标签设置筛选条件
    const filterParams: Record<string, any> = {};
    
    if (newTab === "hot") {
      // 火爆：仅显示被标记为 isHot 的工作流
      filterParams.isHot = true;
      filterParams.sortBy = "sortOrder";
      filterParams.sortOrder = "desc";
      filterParams.category = "";
      filterParams.isVip = undefined;
      filterParams.isFree = undefined;
    } else if (newTab === "free") {
      // 仅按照 VIP 免费可领的标记展示
      filterParams.isVip = true;
      filterParams.sortBy = "createdAt";
      filterParams.sortOrder = "desc";
      filterParams.category = "";
      filterParams.isFree = undefined;
    } else {
      // 其他标签作为分类处理
      filterParams.category = newTab;
      filterParams.sortBy = "createdAt";
      filterParams.sortOrder = "desc";
      filterParams.isVip = undefined;
      filterParams.isFree = undefined;
      filterParams.isHot = undefined;
    }
    
    filter(filterParams);
  }, [filter, search]);

  // 回到顶部功能
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 监听滚动事件，显示/隐藏回到顶部按钮
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 300);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 主要内容区域 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧侧边栏 */}
        <EditableSection page="store" section="sidebar">
          <aside className="w-64 bg-white border-r border-gray-200 rounded-lg flex-shrink-0 mt-3 shadow-lg">
            <div className="p-4 flex flex-col gap-3">
              <Button 
                variant="flat" 
                className="justify-start h-10 bg-white shadow-sm hover:bg-gray-50" 
                startContent={<Icon icon="lucide:cpu" className="text-blue-600 text-base" />}
                onPress={() => handleTabChange("hot")}
              >
                <span className="text-gray-700 text-sm">AI智能体集合</span>
              </Button>
              <Button 
                variant="flat" 
                className="justify-start h-10 bg-white shadow-sm hover:bg-gray-50" 
                startContent={<Icon icon="lucide:shopping-cart" className="text-green-600 text-base" />}
                onPress={() => handleTabChange("orders")}
              >
                <span className="text-gray-700 text-sm">我的购买记录</span>
              </Button>
              <Button 
                variant="flat" 
                className="justify-start h-10 bg-white shadow-sm hover:bg-gray-50" 
                startContent={<Icon icon="lucide:heart" className="text-red-500 text-base" />}
                onPress={() => handleTabChange("favorites")}
              >
                <span className="text-gray-700 text-sm">我的收藏记录</span>
              </Button>
            </div>
          </aside>
        </EditableSection>

        {/* 右侧主内容 */}
        <EditableSection page="store" section="main" className="flex-1 min-w-0">
          <main className="flex flex-col h-full bg-gray-50">
            {/* 标签与搜索区域移动到滚动容器内部，保证与卡片区域右侧对齐 */}

            {/* 卡片区域 - 可滚动 */}
            <EditableSection page="store" section="card-container" className="flex-1 min-h-0">
              <div 
                ref={scrollContainerRef}
                className={`${tab === "orders" ? "p-6" : "p-6 pt-3"} h-full overflow-y-auto`}
              >
                {tab !== "orders" && tab !== "favorites" && (
                  <EditableSection page="store" section="tabs-and-search">
                    <div className="pb-3">
                      <div className="mb-4 bg-gradient-to-br from-blue-50 to-indigo-100 py-3 rounded-lg border border-indigo-100/70">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                          <Tabs 
                            selectedKey={tab} 
                            onSelectionChange={(k) => handleTabChange(String(k))} 
                            radius="none" 
                            className="px-0"
                            classNames={{
                              tabList: "gap-1 w-full relative rounded-none p-0 bg-transparent border-none shadow-none",
                              cursor: "w-full bg-transparent shadow-none border-b-2 border-primary rounded-none",
                              tab: "max-w-fit px-4 py-2 h-10",
                              tabContent: "group-data-[selected=true]:text-primary text-default-500"
                            }}
                          >
                            <Tab key="hot" title="火爆" />
                            <Tab key="free" title="SVIP免费" />
                            <Tab key="books" title="推书" />
                            <Tab key="parenting" title="育儿" />
                            <Tab key="emotion" title="情感" />
                            <Tab key="pets" title="宠物" />
                            <Tab key="english" title="英语" />
                            <Tab key="psychology" title="心理学" />
                            <Tab key="healing" title="治愈" />
                            <Tab key="ancient" title="古风" />
                            <Tab key="metaphysics" title="玄学" />
                            <Tab key="wellness" title="养生" />
                            <Tab key="business" title="创业" />
                            <Tab key="cognition" title="认知" />
                            <Tab key="tools" title="工具" />
                            <Tab key="other" title="其他" />
                          </Tabs>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white rounded-lg px-4 text-sm text-gray-600 h-10 flex items-center shadow-sm border border-gray-100">
                          温馨提示：下载的工作流压缩包无需解压，直接导入扣子空间即可
                        </div>
                        <div className="flex w-80 max-w-full">
                          <Input
                            placeholder="搜索智能体..."
                            value={keyword}
                            onValueChange={setKeyword}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSearch(keyword);
                              }
                            }}
                            className="flex-1"
                            classNames={{
                              input: "text-sm",
                              inputWrapper: "rounded-r-none border-r-0 bg-white shadow-sm h-10 border border-gray-200"
                            }}
                          />
                          <button 
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-lg flex items-center justify-center min-w-[48px] shadow-sm h-10"
                            onClick={() => handleSearch(keyword)}
                          >
                            <Icon icon="lucide:search" className="text-lg" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </EditableSection>
                )}
                {tab === "orders" ? (
                  <PurchaseHistoryContent />
                ) : tab === "favorites" ? (
                  <FavoritesContent />
                ) : (
                  <>
                    {loading && <WorkflowLoadingGrid />}
                    
                    {error && (
                      <WorkflowError 
                        error={error} 
                        onRetry={refresh}
                      />
                    )}
                    
                    {!loading && !error && workflows.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {workflows.map((workflow) => (
                          <StoreCard key={workflow.id} workflow={workflow} />
                        ))}
                      </div>
                    )}
                    
                    {!loading && !error && workflows.length === 0 && (
                      <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Icon icon="lucide:search" className="text-gray-400 text-xl" />
                          </div>
                          <h3 className="text-base font-medium text-gray-900 mb-2">暂无工作流</h3>
                          <p className="text-sm text-gray-500 mb-3">
                            {keyword ? `没有找到包含 "${keyword}" 的工作流` : '当前分类下暂无工作流'}
                          </p>
                          {keyword && (
                            <Button
                              color="primary"
                              variant="flat"
                              startContent={<Icon icon="lucide:x" className="text-sm" />}
                              onPress={() => {
                                setKeyword("");
                                handleSearch("");
                              }}
                            >
                              清除搜索
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 分页信息 */}
                    {pagination && pagination.totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-center">
                        <div className="text-sm text-gray-500">
                          第 {pagination.page} 页，共 {pagination.totalPages} 页，
                          总共 {pagination.total} 个工作流
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </EditableSection>
          </main>
        </EditableSection>
      </div>

      {/* 回到顶部按钮 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50"
          style={{ 
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' 
          }}
        >
          <Icon icon="lucide:arrow-up" className="text-lg" />
        </button>
      )}
    </div>
  );
}