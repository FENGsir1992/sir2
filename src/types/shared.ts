// 前后端共享的类型定义，确保一致性

// API响应通用类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  pagination?: PaginationMeta;
}

// 分页元数据
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 分页查询参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isVip: boolean;
  vipExpiresAt?: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateData {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isVip: boolean;
  balance: number;
  vipExpiresAt?: string;
}

// 工作流相关类型
export interface Workflow {
  id: string;
  code?: number;
  title: string;
  description: string;
  shortDescription?: string;
  author: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  price: number;
  originalPrice?: number;
  isVip: boolean;
  isFree: boolean;
  cover?: string;
  previewVideo?: string;
  demoVideo?: string;
  gallery?: string[];
  attachments?: string[];
  category: string;
  subcategory?: string;
  tags: string[];
  status: WorkflowStatus;
  sortOrder: number;
  isHot: boolean;
  isNew: boolean;
  isDailyRecommended?: boolean;
  workflowCount: number;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  version: string;
  compatibility?: any;
  dependencies?: any;
  requirements?: string;
  features?: string[];
  changelog?: any;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  content?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type WorkflowStatus = 'draft' | 'published' | 'archived' | 'featured';

export interface WorkflowCreateInput {
  title: string;
  description?: string;
  shortDescription?: string;
  price?: number;
  originalPrice?: number;
  isVip?: boolean;
  isFree?: boolean;
  category: string;
  subcategory?: string;
  tags?: string[];
  cover?: string;
  previewVideo?: string;
  demoVideo?: string;
  gallery?: string[];
  version?: string;
  requirements?: string;
  features?: string[];
  content?: string;
}

export interface WorkflowUpdateInput extends Partial<WorkflowCreateInput> {
  status?: WorkflowStatus;
  sortOrder?: number;
  isHot?: boolean;
  isNew?: boolean;
}

// 工作流查询参数
export interface WorkflowQueryParams extends PaginationParams {
  search?: string;
  category?: string;
  subcategory?: string;
  tags?: string;
  status?: WorkflowStatus;
  isVip?: boolean;
  isFree?: boolean;
  isHot?: boolean;
  isNew?: boolean;
  priceRange?: string;
  authorId?: string;
}

// 订单相关类型
export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  orderId: string;
  workflowId: string;
  quantity: number;
  price: number;
  createdAt: string;
}

// 支付相关类型
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'alipay' | 'wechat' | 'credit_card' | 'balance';
export type PaymentStatus = 'pending' | 'success' | 'failed';

// 购物车相关类型
export interface CartItem {
  id: string;
  userId: string;
  workflowId: string;
  quantity: number;
  createdAt: string;
}

// 文件上传相关类型
export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  userId: string;
  createdAt: string;
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
  createdAt: string;
}

// 认证相关类型
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
  token: string;
  expiresIn: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// 验证相关类型
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => ValidationResult;
}

// 错误类型
export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: any;
}

// 状态管理相关类型（前端）
export interface AppUser {
  id: string;
  name: string;      // 对应后端的 username
  email: string;
  avatar?: string;
  isVip?: boolean;
  balance?: number;
  vipExpiresAt?: string;
  isLoggedIn: boolean;
  // 新增字段以保持与后端一致
  username?: string; // 与后端保持一致
}

export interface AppCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

// 元素位置相关类型（前端编辑系统）
export interface ElementPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// 应用状态类型（前端）
export interface AppState {
  user: AppUser | null;
  cart: AppCartItem[];
  editMode: boolean;
  elementPositions: Record<string, ElementPosition>;
  deletedElements: Set<string>;
}

// 媒体文件类型
export interface MediaFile {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  type: 'image' | 'video' | 'file';
}

// 工作流编辑器相关类型
export interface WorkflowEditorProps {
  workflow?: Workflow | null;
  onSave?: (workflow: Workflow) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

// 管理面板相关类型
export interface AdminDashboardStats {
  totalUsers: number;
  totalWorkflows: number;
  totalOrders: number;
  totalRevenue: number;
}

// 通用工具类型
export interface SelectOption {
  label: string;
  value: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: ValidationRule;
}

// 网络请求配置
export interface RequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

// 环境配置
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL?: string;
  FRONTEND_URL?: string;
}

// 常用常量
export const MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/ogg'],
  FILES: ['application/json', 'text/plain']
} as const;

export const FILE_EXTENSIONS = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  VIDEOS: ['.mp4', '.webm', '.ogg'],
  FILES: ['.json', '.txt']
} as const;
