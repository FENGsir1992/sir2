import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError, ValidationError, ErrorType } from './error-handler.js';

// 常用的验证模式
export const commonSchemas = {
  // 邮箱验证
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .required()
    .messages({
      'string.email': '邮箱格式不正确',
      'string.max': '邮箱长度不能超过254个字符',
      'any.required': '邮箱为必填项'
    }),

  // 密码验证
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': '密码长度至少8个字符',
      'string.max': '密码长度不能超过128个字符',
      'string.pattern.base': '密码必须包含大小写字母和数字',
      'any.required': '密码为必填项'
    }),

  // 用户名验证
  username: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.min': '用户名至少2个字符',
      'string.max': '用户名不能超过50个字符',
      'string.pattern.base': '用户名只能包含中文、英文、数字和下划线',
      'any.required': '用户名为必填项'
    }),

  // UUID验证
  uuid: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'ID格式不正确',
      'any.required': 'ID为必填项'
    }),

  // 分页参数
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  },

  // 搜索关键词
  searchQuery: Joi.string()
    .max(100)
    .pattern(/^[^<>'";&|`]*$/)
    .allow('')
    .messages({
      'string.max': '搜索关键词不能超过100个字符',
      'string.pattern.base': '搜索关键词包含非法字符'
    }),

  // 价格
  price: Joi.number()
    .precision(2)
    .min(0)
    .max(999999.99)
    .messages({
      'number.precision': '价格最多保留2位小数',
      'number.min': '价格不能为负数',
      'number.max': '价格不能超过999999.99'
    }),

  // 工作流标题
  workflowTitle: Joi.string()
    .min(1)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min': '标题不能为空',
      'string.max': '标题不能超过200个字符',
      'any.required': '标题为必填项'
    }),

  // 工作流描述
  workflowDescription: Joi.string()
    .max(5000)
    .allow('')
    .messages({
      'string.max': '描述不能超过5000个字符'
    }),

  // 标签数组
  tags: Joi.array()
    .items(
      Joi.string()
        .max(50)
        .pattern(/^[^<>'";&|`]*$/)
        .messages({
          'string.max': '标签长度不能超过50个字符',
          'string.pattern.base': '标签包含非法字符'
        })
    )
    .max(20)
    .messages({
      'array.max': '标签数量不能超过20个'
    })
};

// 验证中间件生成器
export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      throw new ValidationError(errorMessage, {
        details: error.details,
        field: 'body'
      });
    }

    req.body = value;
    next();
  };
}

// 验证查询参数
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      throw new ValidationError(errorMessage, {
        details: error.details,
        field: 'query'
      });
    }

    req.query = value;
    next();
  };
}

// 验证路径参数
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      throw new ValidationError(errorMessage, {
        details: error.details,
        field: 'params'
      });
    }

    req.params = value;
    next();
  };
}

// 输入清理中间件
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // 递归清理对象中的字符串值
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // 移除控制字符
      return value.replace(/[\x00-\x1F\x7F]/g, '').trim();
    } else if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    } else if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  }

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  
  next();
}

// 请求体大小限制
export function limitRequestSize(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        throw new AppError(
          `请求体过大，最大允许${maxSize}`,
          413,
          ErrorType.INTERNAL,
          true,
          'PAYLOAD_TOO_LARGE'
        );
      }
    }
    next();
  };
}

// 解析大小字符串
function parseSize(size: string): number {
  const units: Record<string, number> = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error('Invalid size format');
  }
  
  const value = parseFloat(match[1]!);
  const unit = match[2]!;
  
  return Math.floor(value * units[unit]!);
}

// 常用验证模式
export const validationSchemas = {
  // 用户注册
  userRegister: Joi.object({
    username: commonSchemas.username,
    email: commonSchemas.email,
    password: commonSchemas.password,
    avatar: Joi.string().uri().allow('').messages({
      'string.uri': '头像URL格式不正确'
    })
  }),

  // 用户登录
  userLogin: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': '密码为必填项'
    })
  }),

  // 工作流创建
  workflowCreate: Joi.object({
    title: commonSchemas.workflowTitle,
    description: commonSchemas.workflowDescription,
    shortDescription: Joi.string().max(500).allow(''),
    price: commonSchemas.price.default(0),
    originalPrice: commonSchemas.price.allow(null),
    isVip: Joi.boolean().default(false),
    isFree: Joi.boolean().default(false),
    category: Joi.string().max(50).required(),
    subcategory: Joi.string().max(50).allow(''),
    tags: commonSchemas.tags.default([]),
    cover: Joi.string().uri().allow(''),
    previewVideo: Joi.string().uri().allow(''),
    demoVideo: Joi.string().uri().allow(''),
    gallery: Joi.array().items(Joi.string().uri()).max(10).default([]),
    version: Joi.string().max(20).default('1.0.0'),
    requirements: Joi.string().max(1000).allow(''),
    features: Joi.array().items(Joi.string().max(100)).max(20).default([]),
    content: Joi.object().allow(null)
  }),

  // 工作流查询
  workflowQuery: Joi.object({
    page: commonSchemas.pagination.page,
    limit: commonSchemas.pagination.limit,
    search: commonSchemas.searchQuery,
    category: Joi.string().max(50).allow(''),
    subcategory: Joi.string().max(50).allow(''),
    tags: Joi.string().max(500).allow(''),
    status: Joi.string().valid('draft', 'published', 'archived', 'featured').allow(''),
    isVip: Joi.boolean(),
    isFree: Joi.boolean(),
    isHot: Joi.boolean(),
    isNew: Joi.boolean(),
    priceRange: Joi.string().pattern(/^\d+(?:\.\d+)?-\d+(?:\.\d+)?$/).allow(''),
    authorId: commonSchemas.uuid.allow(''),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'publishedAt', 'price', 'downloadCount', 'rating', 'sortOrder', 'title').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // UUID参数验证
  uuidParam: Joi.object({
    id: commonSchemas.uuid
  })
};

export default {
  validateBody,
  validateQuery,
  validateParams,
  sanitizeInput,
  limitRequestSize,
  validationSchemas,
  commonSchemas
};
