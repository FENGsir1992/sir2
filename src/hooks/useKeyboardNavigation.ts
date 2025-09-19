import { useEffect } from 'react';

/**
 * 键盘导航增强Hook
 * 提供更好的键盘访问性支持
 */
export const useKeyboardNavigation = () => {
  useEffect(() => {
    let isCleanedUp = false;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isCleanedUp) return;
      
      // ESC键关闭模态框或返回上一级
      if (event.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && typeof activeElement.blur === 'function') {
          activeElement.blur();
        }
      }
      
      // Tab键增强焦点管理
      if (event.key === 'Tab') {
        // 添加可见的焦点指示器
        if (document.body) {
          document.body.classList.add('keyboard-navigation');
        }
      }
    };
    
    const handleMouseDown = () => {
      if (isCleanedUp) return;
      
      // 鼠标操作时移除键盘导航样式
      if (document.body) {
        document.body.classList.remove('keyboard-navigation');
      }
    };
    
    // 使用被动监听器提高性能
    const keydownOptions = { passive: true };
    const mousedownOptions = { passive: true };
    
    document.addEventListener('keydown', handleKeyDown, keydownOptions);
    document.addEventListener('mousedown', handleMouseDown, mousedownOptions);
    
    return () => {
      isCleanedUp = true;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      
      // 清理时移除样式类
      if (document.body) {
        document.body.classList.remove('keyboard-navigation');
      }
    };
  }, []);
};

/**
 * 焦点管理Hook
 * 用于管理组件的焦点状态
 */
export const useFocusManagement = (autoFocus = false) => {
  useEffect(() => {
    if (autoFocus) {
      // 延迟聚焦，确保DOM已渲染
      const timer = setTimeout(() => {
        const firstFocusable = document.querySelector(
          'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);
};
