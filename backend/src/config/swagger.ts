import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Swagger配置
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WZ工作流迁移系统 API',
      version: '1.0.0',
      description: '工作流迁移系统的完整API文档',
      contact: {
        name: 'WZ Team',
        email: 'support@wz.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.SWAGGER_DEV_URL || 'http://localhost:3001',
        description: '开发环境'
      },
      {
        url: process.env.SWAGGER_PROD_URL || 'https://api.wz.com',
        description: '生产环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT认证token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '用户ID' },
            username: { type: 'string', description: '用户名' },
            email: { type: 'string', format: 'email', description: '邮箱' },
            avatar: { type: 'string', description: '头像URL' },
            isVip: { type: 'boolean', description: '是否SVIP用户' },
            balance: { type: 'number', description: '余额' },
            vipExpiresAt: { type: 'string', format: 'date-time', description: 'SVIP用户过期时间' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        Workflow: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '工作流ID' },
            title: { type: 'string', description: '标题' },
            description: { type: 'string', description: '详细描述' },
            shortDescription: { type: 'string', description: '简短描述' },
            author: { type: 'string', description: '作者名称' },
            authorId: { type: 'string', description: '作者ID' },
            price: { type: 'number', description: '价格' },
            originalPrice: { type: 'number', description: '原价' },
            isVip: { type: 'boolean', description: '是否SVIP用户专享' },
            isFree: { type: 'boolean', description: '是否免费' },
            cover: { type: 'string', description: '封面图片URL' },
            previewVideo: { type: 'string', description: '预览视频URL' },
            category: { type: 'string', description: '分类' },
            subcategory: { type: 'string', description: '子分类' },
            tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
            status: { 
              type: 'string', 
              enum: ['draft', 'published', 'archived', 'featured'],
              description: '状态'
            },
            isHot: { type: 'boolean', description: '是否热门' },
            isNew: { type: 'boolean', description: '是否新品' },
            workflowCount: { type: 'integer', description: '工作流数量' },
            downloadCount: { type: 'integer', description: '下载次数' },
            rating: { type: 'number', description: '评分' },
            ratingCount: { type: 'integer', description: '评分人数' },
            version: { type: 'string', description: '版本号' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' },
            publishedAt: { type: 'string', format: 'date-time', description: '发布时间' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '订单ID' },
            userId: { type: 'string', description: '用户ID' },
            status: { 
              type: 'string',
              enum: ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'refunded', 'paid'],
              description: '订单状态'
            },
            totalAmount: { type: 'number', description: '总金额' },
            paymentMethod: { type: 'string', description: '支付方式' },
            paymentId: { type: 'string', description: '支付ID' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: '请求是否成功' },
            data: { type: 'object', description: '响应数据' },
            message: { type: 'string', description: '响应消息' },
            error: { type: 'string', description: '错误信息' },
            code: { type: 'string', description: '错误代码' }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: '请求是否成功' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { type: 'object' }, description: '数据列表' },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', description: '当前页码' },
                    limit: { type: 'integer', description: '每页数量' },
                    total: { type: 'integer', description: '总数量' },
                    pages: { type: 'integer', description: '总页数' }
                  }
                }
              }
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', description: '邮箱' },
            password: { type: 'string', minLength: 8, description: '密码' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 2, maxLength: 50, description: '用户名' },
            email: { type: 'string', format: 'email', description: '邮箱' },
            password: { type: 'string', minLength: 8, description: '密码' },
            avatar: { type: 'string', description: '头像URL' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '支付ID' },
            orderId: { type: 'string', description: '订单ID' },
            userId: { type: 'string', description: '用户ID' },
            amount: { type: 'number', description: '支付金额' },
            method: { 
              type: 'string', 
              enum: ['alipay', 'wechat', 'balance'], 
              description: '支付方式' 
            },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'success', 'failed', 'cancelled'], 
              description: '支付状态' 
            },
            transactionId: { type: 'string', description: '第三方交易ID' },
            failureReason: { type: 'string', description: '失败原因' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
          }
        },
        WechatPayRequest: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string', description: '订单ID' }
          }
        },
        AlipayPayRequest: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string', description: '订单ID' },
            type: { 
              type: 'string', 
              enum: ['page', 'wap', 'qr'], 
              description: '支付类型',
              default: 'page'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './dist/routes/*.js',
    './dist/routes/**/*.js'
  ]
};

// 生成Swagger文档
export const swaggerSpec = swaggerJSDoc(swaggerOptions);

// 设置Swagger UI
export function setupSwagger(app: Express) {
  // Swagger JSON端点
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'WZ API文档',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2
    }
  }));

  // 【硬编码修复】使用环境变量获取端口
  const port = process.env.PORT || '3001';
  const host = process.env.HOST || 'localhost';
  
  console.log('📚 API文档已启用:');
  console.log(`   - Swagger UI: http://${host}:${port}/api-docs`);
  console.log(`   - JSON规范: http://${host}:${port}/api-docs.json`);
}

export default swaggerSpec;

