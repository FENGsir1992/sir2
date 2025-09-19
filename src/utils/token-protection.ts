// Token保护工具 - 防止token丢失
export class TokenProtection {
  private static readonly SESSION_KEY = 'wz.auth.session.v1';
  private static readonly BACKUP_KEY = 'wz.auth.token.backup';
  
  // 保存token的备份
  static backupToken(token: string) {
    try {
      localStorage.setItem(this.BACKUP_KEY, token);
      console.log('🔒 Token backup saved');
    } catch (error) {
      console.warn('Token backup failed:', error);
    }
  }
  
  // 检查并修复缺失的token
  static checkAndRepairToken(): boolean {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return false;
      
      const session = JSON.parse(sessionData);
      
      // 如果session存在但token缺失
      if (session && !session.token) {
        const backupToken = localStorage.getItem(this.BACKUP_KEY);
        
        if (backupToken) {
          // 恢复token
          session.token = backupToken;
          localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
          console.log('🔧 Token restored from backup');
          return true;
        } else {
          console.warn('⚠️ Token missing and no backup found');
          return false;
        }
      }
      
      return !!session.token;
    } catch (error) {
      console.error('Token check failed:', error);
      return false;
    }
  }
  
  // 验证token是否有效（基本检查）
  static validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    // JWT token基本格式检查
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // 检查header和payload是否可以解码
      atob(parts[0]);
      atob(parts[1]);
      return true;
    } catch {
      return false;
    }
  }
  
  // 清理所有token相关数据
  static clearAll() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.BACKUP_KEY);
    console.log('🗑️ All token data cleared');
  }
}

// 页面加载时自动检查token
if (typeof window !== 'undefined') {
  // 延迟检查，确保页面加载完成
  setTimeout(() => {
    TokenProtection.checkAndRepairToken();
  }, 1000);
}
