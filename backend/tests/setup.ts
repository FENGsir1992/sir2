import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { initDatabase, closeDatabase, db } from '../src/database/init';
import { cache } from '../src/utils/cache';
import jwt from 'jsonwebtoken';

// 测试数据库配置
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:'; // 使用内存数据库
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.LOG_LEVEL = 'error'; // 减少测试时的日志输出

// 全局测试设置
beforeAll(async () => {
  // 初始化测试数据库
  await initDatabase();
  console.log('🧪 测试数据库已初始化');
});

afterAll(async () => {
  // 清理测试数据库
  await closeDatabase();
  console.log('🧹 测试数据库已清理');
});

beforeEach(async () => {
  // 每个测试前清空缓存
  cache.flushAll();
});

afterEach(async () => {
  // 每个测试后清理数据（可选）
  // 如果需要隔离测试数据，可以在这里清理数据库表
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('测试中未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('测试中未捕获的异常:', error);
});

// 测试工具函数
export const testUtils = {
  // 创建测试用户
  async createTestUser(userData: Partial<any> = {}) {
    const uid = 'test-user-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    const defaultUser = {
      id: uid,
      username: 'testuser',
      email: `test-${uid}@example.com`,
      passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
      isVip: false,
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const user = { ...defaultUser, ...userData };
    await db('users').insert(user);
    return user;
  },

  // 创建测试工作流
  async createTestWorkflow(workflowData: Partial<any> = {}) {
    const wid = 'test-workflow-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    const defaultWorkflow = {
      id: wid,
      title: '测试工作流',
      description: '这是一个测试工作流',
      author: '测试作者',
      authorId: 'test-author-id',
      price: 0,
      isVip: false,
      isFree: true,
      status: 'published',
      category: 'test',
      tags: JSON.stringify(['test']),
      workflowCount: 1,
      downloadCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const workflow = { ...defaultWorkflow, ...workflowData };
    await db('workflows').insert(workflow);
    return workflow;
  },

  // 清理测试数据
  async cleanupTestData() {
    await db('users').where('id', 'like', 'test-%').orWhere('email', 'like', 'test-%@example.com').orWhere('email', 'admin@wz.com').del();
    await db('workflows').where('id', 'like', 'test-%').del();
    await db('orders').where('id', 'like', 'test-%').del();
  },

  // 生成测试JWT token
  generateTestToken(userId: string = 'test-user') {
    const secret: string = process.env.JWT_SECRET ?? 'test-jwt-secret-key-for-testing-only';
    return jwt.sign(
      { userId, email: 'test@example.com' },
      secret,
      { expiresIn: '1h' }
    );
  }
};

export default testUtils;

