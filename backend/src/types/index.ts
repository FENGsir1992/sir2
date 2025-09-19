// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  isVip: boolean;
  vipExpiresAt?: Date;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateData {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isVip: boolean;
  vipExpiresAt?: Date;
  balance: number;
  createdAt: Date;
}

// 工作流相关类型
export interface Workflow {
  id: string;
  title: string;
  description: string;
  author: string;
  authorId: string;
  price: number;
  isVip: boolean;
  isFree: boolean;
  cover?: string;
  tags: string[];
  workflowCount: number;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  content?: string; // JSON格式的工作流内容
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowCreateData {
  title: string;
  description?: string;
  price: number;
  isVip?: boolean;
  cover?: string;
  tags: string[];
  workflowCount?: number;
  content?: string;
}

// 订单相关类型
export interface Order {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled' | 'refunded';
  totalAmount: number;
  shippingAddress?: string;
  trackingNumber?: string;
  paymentMethod?: string;
  paymentId?: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  workflowId: string;
  workflowTitle: string;
  price: number;
  quantity: number;
}

export interface OrderCreateData {
  items: {
    workflowId: string;
    quantity: number;
  }[];
  shippingAddress?: string;
  paymentMethod?: string;
}

// 支付相关类型
export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: 'alipay' | 'wechat' | 'balance';
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  transactionId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCreateData {
  orderId: string;
  method: 'alipay' | 'wechat' | 'balance';
  returnUrl?: string;
}

// 购物车相关类型
export interface CartItem {
  id: string;
  userId: string;
  workflowId: string;
  quantity: number;
  createdAt: Date;
}

// 会员相关类型
export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // 天数
  features: string[];
  isActive: boolean;
  createdAt: Date;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 错误类型
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// JWT载荷类型
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// 文件上传类型
export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  userId: string;
  createdAt: Date;
}
