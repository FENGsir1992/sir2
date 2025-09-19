// 扩展的工作流类型定义
export interface ExtendedWorkflow {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  price: number;
  originalPrice?: number;
  isVip: boolean;
  isFree: boolean;
  
  // 媒体文件
  cover?: string;
  previewVideo?: string;
  demoVideo?: string;
  gallery?: string[]; // 图片画廊
  
  // 分类和标签
  category: string;
  subcategory?: string;
  tags: string[];
  
  // 状态和排序
  status: 'draft' | 'published' | 'archived' | 'featured';
  sortOrder: number;
  isHot: boolean;
  isNew: boolean;
  
  // 统计信息
  workflowCount: number;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  
  // 技术信息
  version: string;
  compatibility?: any;
  dependencies?: any;
  requirements?: string;
  features?: string;
  changelog?: any;
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  
  // 内容
  content?: string; // JSON格式的工作流内容
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface WorkflowCreateInput {
  title: string;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  isVip?: boolean;
  isFree?: boolean;
  cover?: string;
  previewVideo?: string;
  demoVideo?: string;
  gallery?: string[];
  category?: string;
  subcategory?: string;
  tags: string[];
  status?: 'draft' | 'published' | 'archived' | 'featured';
  sortOrder?: number;
  isHot?: boolean;
  isNew?: boolean;
  workflowCount?: number;
  version?: string;
  compatibility?: any;
  dependencies?: any;
  requirements?: string;
  features?: string;
  changelog?: any;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  content?: string;
}

export interface WorkflowUpdateInput extends Partial<WorkflowCreateInput> {
  id: string;
}

export interface WorkflowQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subcategory?: string;
  tags?: string;
  status?: string;
  isVip?: boolean;
  isFree?: boolean;
  isHot?: boolean;
  isNew?: boolean;
  priceRange?: string;
  authorId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'price' | 'downloadCount' | 'rating' | 'sortOrder';
  sortOrder?: 'asc' | 'desc';
}

// 工作流分类
export interface WorkflowCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  subcategories?: WorkflowSubcategory[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowSubcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
