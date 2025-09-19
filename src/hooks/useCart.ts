import { useState, useEffect, useCallback } from 'react';
import { cartApi } from '../utils/api-client';

interface CartItem {
  id: string;
  workflowId: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  isVip: boolean;
  isFree: boolean;
  cover?: string;
  workflowCount: number;
  quantity: number;
  createdAt: string;
}

interface CartData {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await cartApi.getCart();
      
      if (response.success && response.data) {
        setCart(response.data);
      } else {
        throw new Error(response.error || '获取购物车失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '获取购物车失败';
      console.error('获取购物车失败:', errorMessage);
      setError(errorMessage);
      // 设置空购物车作为fallback
      setCart({ items: [], totalAmount: 0, totalItems: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (workflowId: string, quantity: number = 1) => {
    try {
      const response = await cartApi.addToCart(workflowId, quantity);
      
      if (response.success) {
        await fetchCart(); // 重新获取购物车数据
        return { success: true, message: response.message };
      } else {
        throw new Error(response.error || '添加到购物车失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '添加到购物车失败';
      console.error('添加到购物车失败:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fetchCart]);

  const updateCartItem = useCallback(async (itemId: string, quantity: number) => {
    try {
      const response = await cartApi.updateCartItem(itemId, quantity);
      
      if (response.success) {
        await fetchCart(); // 重新获取购物车数据
        return { success: true, message: response.message };
      } else {
        throw new Error(response.error || '更新购物车失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '更新购物车失败';
      console.error('更新购物车失败:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fetchCart]);

  const removeFromCart = useCallback(async (itemId: string) => {
    try {
      const response = await cartApi.removeFromCart(itemId);
      
      if (response.success) {
        await fetchCart(); // 重新获取购物车数据
        return { success: true, message: response.message };
      } else {
        throw new Error(response.error || '从购物车移除失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '从购物车移除失败';
      console.error('从购物车移除失败:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    try {
      const response = await cartApi.clearCart();
      
      if (response.success) {
        setCart({ items: [], totalAmount: 0, totalItems: 0 });
        return { success: true, message: response.message };
      } else {
        throw new Error(response.error || '清空购物车失败');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || '清空购物车失败';
      console.error('清空购物车失败:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 检查工作流是否在购物车中
  const isInCart = useCallback((workflowId: string) => {
    if (!cart) return false;
    return cart.items.some(item => item.workflowId === workflowId);
  }, [cart]);

  // 获取购物车中指定工作流的数量
  const getCartItemQuantity = useCallback((workflowId: string) => {
    if (!cart) return 0;
    const item = cart.items.find(item => item.workflowId === workflowId);
    return item ? item.quantity : 0;
  }, [cart]);

  // 初始化时获取购物车数据
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    cart,
    items: cart?.items || [],
    totalAmount: cart?.totalAmount || 0,
    totalItems: cart?.totalItems || 0,
    loading,
    error,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    isInCart,
    getCartItemQuantity
  };
}


