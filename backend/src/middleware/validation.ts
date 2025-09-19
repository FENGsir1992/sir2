import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './error-handler.js';

// 通用验证中间件
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ValidationError('输入验证失败', { errors });
    }

    req.body = value;
    next();
  };
}

// 常用验证模式
export const schemas = {
  // 用户注册验证
  userRegister: Joi.object({
    username: Joi.string().min(2).max(50).required().messages({
      'string.min': '用户名至少2个字符',
      'string.max': '用户名最多50个字符',
      'any.required': '用户名为必填项'
    }),
    email: Joi.string().email().required().messages({
      'string.email': '邮箱格式不正确',
      'any.required': '邮箱为必填项'
    }),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
      'string.min': '密码至少8个字符',
      'string.max': '密码最多128个字符',
      'string.pattern.base': '密码必须包含大小写字母和数字',
      'any.required': '密码为必填项'
    }),
    avatar: Joi.string().uri().optional()
  }),

  // 用户登录验证
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // 工作流创建验证
  workflowCreate: Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
      'string.min': '标题不能为空',
      'string.max': '标题最多200个字符',
      'any.required': '标题为必填项'
    }),
    description: Joi.string().max(5000).optional(),
    shortDescription: Joi.string().max(500).optional(),
    price: Joi.number().min(0).max(999999.99).default(0),
    isVip: Joi.boolean().default(false),
    isFree: Joi.boolean().default(false),
    category: Joi.string().max(50).default('general'),
    subcategory: Joi.string().max(50).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(20).default([]),
    cover: Joi.string().uri().optional(),
    previewVideo: Joi.string().uri().optional(),
    gallery: Joi.array().items(Joi.string().uri()).max(10).default([])
  }),

  // 订单创建验证
  orderCreate: Joi.object({
    items: Joi.array().items(
      Joi.object({
        workflowId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).max(10).default(1)
      })
    ).min(1).max(50).required().messages({
      'array.min': '至少需要一个订单项',
      'array.max': '一次最多购买50个商品'
    }),
    paymentMethod: Joi.string().valid('balance', 'wechat', 'alipay').default('balance')
  }),

  // 评论验证
  reviewCreate: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.min': '评分最低1分',
      'number.max': '评分最高5分',
      'any.required': '评分为必填项'
    }),
    comment: Joi.string().max(1000).optional().messages({
      'string.max': '评论最多1000个字符'
    })
  }),

  // 分页参数验证
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().max(50).optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // 搜索参数验证
  search: Joi.object({
    search: Joi.string().min(1).max(100).optional(),
    category: Joi.string().max(50).optional(),
    subcategory: Joi.string().max(50).optional(),
    tags: Joi.string().max(500).optional(),
    priceRange: Joi.string().pattern(/^\d+,\d+$/).optional(),
    isVip: Joi.boolean().optional(),
    isFree: Joi.boolean().optional(),
    isHot: Joi.boolean().optional(),
    isNew: Joi.boolean().optional()
  })
};

// 参数验证中间件（用于query参数）
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ValidationError('查询参数验证失败', { errors });
    }

    req.query = value;
    next();
  };
}

// 文件上传验证
export function validateFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
} = {}) {
  const {
    maxSize = 200 * 1024 * 1024, // 200MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    required = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;

    if (required && !file) {
      throw new ValidationError('文件为必填项');
    }

    if (file) {
      if (file.size > maxSize) {
        throw new ValidationError(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      if (!allowedTypes.includes(file.mimetype)) {
        throw new ValidationError(`不支持的文件类型: ${file.mimetype}`);
      }
    }

    next();
  };
}

// XSS防护 - 清理HTML输入
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // 基础XSS防护 - 转义HTML特殊字符
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    
    return value;
  }

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
}

export default validate;

