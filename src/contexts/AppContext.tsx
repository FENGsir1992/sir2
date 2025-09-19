import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { saveSession, loadSession } from '../utils/auth-db';

// 导入共享类型，确保类型一致性
import type { AppUser } from '../types/shared';

// 使用共享的用户类型定义
type User = AppUser;

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface AppState {
  user: User;
  cart: CartItem[];
  cartCount: number;
  theme: 'light' | 'dark';
  loading: boolean;
  editMode?: boolean;
  elementPositions?: Record<string, { x: number; y: number; width?: number; height?: number }>;
  selectedElement?: string | null;
  selectedElements?: string[];
  deletedElements?: string[];
}

// 定义动作类型
type AppAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'SET_ELEMENT_POSITION'; payload: { id: string; pos: { x: number; y: number; width?: number; height?: number } } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'COPY_ELEMENT'; payload: { id: string; newId: string } }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: string[] }
  | { type: 'SAVE_POSITIONS' };

// 初始状态
const initialState: AppState = {
  user: {
    id: '',
    name: '',
    email: '',
    isLoggedIn: false,
  },
  cart: [],
  cartCount: 0,
  theme: 'light',
  loading: false,
  editMode: false,
  elementPositions: {},
  selectedElement: null,
  selectedElements: [],
  deletedElements: [],
};

// Reducer 函数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: {
          id: '',
          name: '',
          email: '',
          isLoggedIn: false,
        },
      };
    case 'ADD_TO_CART':
      const existingItem = state.cart.find(item => item.id === action.payload.id);
      if (existingItem) {
        const updatedCart = state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        return {
          ...state,
          cart: updatedCart,
          cartCount: updatedCart.reduce((sum, item) => sum + item.quantity, 0),
        };
      } else {
        const newCart = [...state.cart, action.payload];
        return {
          ...state,
          cart: newCart,
          cartCount: newCart.reduce((sum, item) => sum + item.quantity, 0),
        };
      }
    case 'REMOVE_FROM_CART':
      const filteredCart = state.cart.filter(item => item.id !== action.payload);
      return {
        ...state,
        cart: filteredCart,
        cartCount: filteredCart.reduce((sum, item) => sum + item.quantity, 0),
      };
    case 'UPDATE_CART_QUANTITY':
      const updatedCart = state.cart.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return {
        ...state,
        cart: updatedCart,
        cartCount: updatedCart.reduce((sum, item) => sum + item.quantity, 0),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
        cartCount: 0,
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_EDIT_MODE':
      return {
        ...state,
        editMode: action.payload,
      };
    case 'SET_ELEMENT_POSITION': {
      const next = { ...(state.elementPositions || {}) };
      next[action.payload.id] = action.payload.pos;
      return {
        ...state,
        elementPositions: next,
      };
    }
    case 'DELETE_ELEMENT': {
      const newDeleted = [...(state.deletedElements || []), action.payload];
      const newPositions = { ...(state.elementPositions || {}) };
      delete newPositions[action.payload];
      
      return {
        ...state,
        elementPositions: newPositions,
        deletedElements: newDeleted,
        selectedElement: state.selectedElement === action.payload ? null : state.selectedElement,
        selectedElements: (state.selectedElements || []).filter(id => id !== action.payload)
      };
    }
    case 'COPY_ELEMENT': {
      const originalPos = state.elementPositions?.[action.payload.id];
      if (originalPos) {
        const newPositions = { ...(state.elementPositions || {}) };
        newPositions[action.payload.newId] = {
          ...originalPos,
          x: originalPos.x + 20,
          y: originalPos.y + 20
        };
        return {
          ...state,
          elementPositions: newPositions
        };
      }
      return state;
    }
    case 'SELECT_ELEMENT': {
      return {
        ...state,
        selectedElement: action.payload
      };
    }
    case 'SET_SELECTED_ELEMENTS': {
      return {
        ...state,
        selectedElements: action.payload
      };
    }
    case 'SAVE_POSITIONS': {
      try {
        localStorage.setItem('wz_element_positions', JSON.stringify(state.elementPositions || {}));
        localStorage.setItem('wz_deleted_elements', JSON.stringify(state.deletedElements || []));
      } catch (error) {
        console.warn('Failed to save positions to localStorage:', error);
      }
      return state;
    }
    default:
      return state;
  }
}

// Context 创建
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider 组件
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // hydrate session from localStorage on mount
  React.useEffect(() => {
    const sess = loadSession();
    if (sess) {
      dispatch({ 
        type: 'SET_USER', 
        payload: { 
          id: sess.id, 
          name: sess.name, 
          email: sess.email, 
          avatar: sess.avatar, 
          isVip: sess.isVip,
          balance: sess.balance,
          isLoggedIn: true 
        } 
      });
    }
    
    // hydrate element positions
    try {
      const raw = localStorage.getItem('wz_element_positions');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed || {}).forEach(([id, pos]) => {
          // 运行时类型检查
          if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos && 
              typeof pos.x === 'number' && typeof pos.y === 'number') {
            dispatch({ type: 'SET_ELEMENT_POSITION', payload: { id, pos: pos as { x: number; y: number; width?: number; height?: number } } });
          }
        });
      }
      
      const deletedRaw = localStorage.getItem('wz_deleted_elements');
      if (deletedRaw) {
        const deletedElements = JSON.parse(deletedRaw);
        deletedElements.forEach((id: string) => {
          dispatch({ type: 'DELETE_ELEMENT', payload: id });
        });
      }
      
      const em = localStorage.getItem('wz_edit_mode');
      if (em) {
        dispatch({ type: 'SET_EDIT_MODE', payload: em === 'true' });
      }
    } catch (error) {
      console.warn('Failed to load element positions from localStorage:', error);
    }
  }, []);

  // persist edit mode
  React.useEffect(() => {
    try { 
      localStorage.setItem('wz_edit_mode', String(state.editMode)); 
    } catch (error) {
      console.warn('Failed to save edit mode to localStorage:', error);
    }
  }, [state.editMode]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// 自定义 Hook
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// 便捷的 Hook
export function useUser() {
  const { state, dispatch } = useAppContext();
  
  const login = (user: Omit<User, 'isLoggedIn'>, token?: string) => {
    dispatch({ type: 'SET_USER', payload: { ...user, isLoggedIn: true } });
    
    // 从localStorage获取可能已经保存的完整session数据
    const existingSession = loadSession();
    
    saveSession({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      avatar: user.avatar,
      isVip: user.isVip,
      balance: user.balance,
      vipExpiresAt: user.vipExpiresAt,
      token: token || existingSession?.token // 优先使用传入的token，否则保持现有token
    });
    
    console.log('AppContext login - 保存session with token:', !!(token || existingSession?.token));
  };
  
  const updateUser = (updates: Partial<User>) => {
    const current = state.user;
    const next: User = { ...current, ...updates } as User;
    // 保持登录状态不被覆盖
    if (current.isLoggedIn) {
      next.isLoggedIn = true;
    }
    
    // 【数据一致性改进】验证关键字段的合理性
    if (next.balance !== undefined && next.balance < 0) {
      console.warn('用户余额不能为负数，已重置为0');
      next.balance = 0;
    }
    
    if (next.vipExpiresAt && next.isVip) {
      const expiresAt = new Date(next.vipExpiresAt);
      if (expiresAt < new Date()) {
        console.warn('VIP已过期，自动更新状态');
        next.isVip = false;
      }
    }
    
    dispatch({ type: 'SET_USER', payload: next });

    // 【数据一致性改进】同步更新localStorage，确保数据一致性
    const sessionData = {
      id: next.id,
      name: next.name,
      email: next.email,
      avatar: next.avatar,
      isVip: next.isVip,
      balance: next.balance,
      vipExpiresAt: next.vipExpiresAt,
    };
    
    const existingSession = loadSession();
    if (existingSession) {
      saveSession({
        ...existingSession,
        ...sessionData,
      });
    } else {
      // 未找到会话但前端有用户，保存基础字段
      saveSession(sessionData);
    }
    
    // 触发数据同步检查
    setTimeout(() => {
      validateDataConsistency();
    }, 100);
  };
  
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
    saveSession(null);
  };
  
  // 【数据一致性改进】验证数据一致性的函数
  const validateDataConsistency = () => {
    try {
      const sessionData = loadSession();
      const currentUser = state.user;
      
      if (sessionData && currentUser.isLoggedIn) {
        // 检查关键字段是否一致
        const inconsistencies: string[] = [];
        
        if (sessionData.id !== currentUser.id) {
          inconsistencies.push('用户ID');
        }
        if (sessionData.isVip !== currentUser.isVip) {
          inconsistencies.push('VIP状态');
        }
        if (Math.abs((sessionData.balance || 0) - (currentUser.balance || 0)) > 0.01) {
          inconsistencies.push('用户余额');
        }
        
        if (inconsistencies.length > 0) {
          console.warn('检测到数据不一致:', inconsistencies.join(', '));
          // 以localStorage为准进行同步
          dispatch({
            type: 'SET_USER',
            payload: {
              ...currentUser,
              isVip: sessionData.isVip,
              balance: sessionData.balance,
              vipExpiresAt: sessionData.vipExpiresAt,
            }
          });
        }
      }
    } catch (error) {
      console.error('数据一致性验证失败:', error);
    }
  };
  
  return {
    user: state.user,
    login,
    logout,
    updateUser,
    validateDataConsistency, // 暴露验证函数供外部调用
  };
}

export function useCart() {
  const { state, dispatch } = useAppContext();
  
  const addToCart = (item: CartItem) => {
    dispatch({ type: 'ADD_TO_CART', payload: item });
  };
  
  const removeFromCart = (id: number) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  };
  
  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: 'UPDATE_CART_QUANTITY', payload: { id, quantity } });
  };
  
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };
  
  return {
    cart: state.cart,
    cartCount: state.cartCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}
