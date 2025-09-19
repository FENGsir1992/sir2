import React from "react";
import { Button, Card, CardBody, Avatar, Input, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { orderApi } from "../../utils/api-client";
import { WorkflowLoadingGrid } from "../../components/WorkflowLoadingCard";
import { WorkflowError } from "../../components/WorkflowError";

interface CartItemProps {
  item: any;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

function CartItemCard({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const [quantity, setQuantity] = React.useState(item.quantity);
  const [updating, setUpdating] = React.useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity === quantity) return;
    
    setUpdating(true);
    setQuantity(newQuantity);
    await onUpdateQuantity(item.id, newQuantity);
    setUpdating(false);
  };

  const handleRemove = async () => {
    setUpdating(true);
    await onRemove(item.id);
    setUpdating(false);
  };

  const formatPrice = (price: number, isFree: boolean) => {
    if (isFree) return "免费";
    return `¥${price.toFixed(2)}`;
  };

  return (
    <Card shadow="sm" className="overflow-hidden">
      <CardBody className="p-4">
        <div className="flex gap-4">
          {/* 工作流封面 */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-300 to-fuchsia-300 rounded-lg overflow-hidden">
              {item.cover ? (
                <img 
                  src={item.cover} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="lucide:image" className="text-white text-2xl" />
                </div>
              )}
            </div>
          </div>

          {/* 工作流信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-normal text-gray-900 line-clamp-2 mb-1">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Avatar 
                    size="sm" 
                    src="/TX.jpg"
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-600">{item.author}</span>
                  {item.isVip && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {item.workflowCount} 个工作流
                </div>
              </div>

              {/* 价格和操作 */}
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 mb-2">
                  {formatPrice(item.price, item.isFree)}
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span className="text-sm text-gray-500 line-through ml-2">
                      ¥{item.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                
                {/* 数量控制 */}
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    size="sm"
                    variant="flat"
                    isIconOnly
                    className="w-8 h-8"
                    onPress={() => handleQuantityChange(quantity - 1)}
                    isDisabled={quantity <= 1 || updating}
                  >
                    <Icon icon="lucide:minus" className="text-sm" />
                  </Button>
                  <Input
                    size="sm"
                    value={String(quantity)}
                    className="w-16"
                    classNames={{
                      input: "text-center",
                      inputWrapper: "h-8"
                    }}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value) || 1;
                      handleQuantityChange(newQuantity);
                    }}
                    isDisabled={updating}
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    isIconOnly
                    className="w-8 h-8"
                    onPress={() => handleQuantityChange(quantity + 1)}
                    isDisabled={updating}
                  >
                    <Icon icon="lucide:plus" className="text-sm" />
                  </Button>
                </div>

                {/* 删除按钮 */}
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  startContent={<Icon icon="lucide:trash-2" className="text-sm" />}
                  onPress={handleRemove}
                  isDisabled={updating}
                  className="h-8"
                >
                  移除
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const {
    items,
    totalAmount,
    totalItems,
    loading,
    error,
    fetchCart,
    updateCartItem,
    removeFromCart,
    clearCart
  } = useCart();

  const [checkingOut, setCheckingOut] = React.useState(false);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    const result = await updateCartItem(itemId, quantity);
    if (!result.success) {
      console.error('更新购物车失败:', result.error);
      // 这里可以显示toast提示
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const result = await removeFromCart(itemId);
    if (!result.success) {
      console.error('移除商品失败:', result.error);
      // 这里可以显示toast提示
    }
  };

  const handleClearCart = async () => {
    const result = await clearCart();
    if (!result.success) {
      console.error('清空购物车失败:', result.error);
      // 这里可以显示toast提示
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setCheckingOut(true);
    
    try {
      // 构建订单数据
      const orderData = {
        items: items.map(item => ({
          workflowId: item.workflowId,
          quantity: item.quantity
        })),
        paymentMethod: 'balance' // 默认使用余额支付
      };

      const response = await orderApi.createOrder(orderData);
      
      if (response.success) {
        // 跳转到订单列表页面（因为订单详情页面可能还没实现）
        navigate('/orders');
      } else {
        throw new Error(response.error || '创建订单失败');
      }
    } catch (err) {
      console.error('结算失败:', err);
      // 这里可以显示错误提示
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <Button
              variant="flat"
              startContent={<Icon icon="lucide:arrow-left" />}
              onPress={() => navigate(-1)}
              className="mb-4"
            >
              返回
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">购物车</h1>
          </div>
          <WorkflowLoadingGrid count={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <Button
              variant="flat"
              startContent={<Icon icon="lucide:arrow-left" />}
              onPress={() => navigate(-1)}
              className="mb-4"
            >
              返回
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">购物车</h1>
          </div>
          <WorkflowError error={error} onRetry={fetchCart} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 头部 */}
        <div className="mb-6">
          <Button
            variant="flat"
            startContent={<Icon icon="lucide:arrow-left" />}
            onPress={() => navigate(-1)}
            className="mb-4"
          >
            返回
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              购物车 {totalItems > 0 && `(${totalItems})`}
            </h1>
            {items.length > 0 && (
              <Button
                variant="flat"
                color="danger"
                startContent={<Icon icon="lucide:trash-2" />}
                onPress={handleClearCart}
              >
                清空购物车
              </Button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          // 空购物车状态
          <Card className="py-12">
            <CardBody>
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon icon="lucide:shopping-cart" className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">购物车是空的</h3>
                <p className="text-gray-600 mb-4">去工作流商店看看有什么好东西吧！</p>
                <Button
                  color="primary"
                  startContent={<Icon icon="lucide:shopping-bag" />}
                  onPress={() => navigate('/store')}
                >
                  去购物
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          // 购物车内容
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 购物车商品列表 */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>

            {/* 订单摘要 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardBody className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">订单摘要</h3>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">商品数量</span>
                      <span className="text-gray-900">{totalItems} 件</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">商品总价</span>
                      <span className="text-gray-900">¥{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">优惠</span>
                      <span className="text-green-600">-¥0.00</span>
                    </div>
                  </div>

                  <Divider className="mb-4" />

                  <div className="flex justify-between text-lg font-semibold mb-6">
                    <span>总计</span>
                    <span className="text-primary">¥{totalAmount.toFixed(2)}</span>
                  </div>

                  <Button
                    color="primary"
                    size="lg"
                    className="w-full"
                    startContent={<Icon icon="lucide:credit-card" />}
                    onPress={handleCheckout}
                    isLoading={checkingOut}
                    isDisabled={items.length === 0}
                  >
                    {checkingOut ? '正在结算...' : '立即结算'}
                  </Button>

                  <div className="mt-4 text-center">
                    <Button
                      variant="flat"
                      startContent={<Icon icon="lucide:arrow-left" />}
                      onPress={() => navigate('/store')}
                    >
                      继续购物
                    </Button>
                  </div>

                  {/* 支付方式说明 */}
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Icon icon="lucide:info" className="text-blue-500 text-sm mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700">
                        <div className="font-semibold mb-1">支付说明</div>
                        <div>支持余额支付，VIP用户可免费获取VIP工作流。</div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}