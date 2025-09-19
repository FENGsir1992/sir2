import request from 'supertest';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/server.js';
import { testUtils } from './setup.js';

describe('工作流API测试', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    await testUtils.cleanupTestData();
    testUser = await testUtils.createTestUser();
    authToken = testUtils.generateTestToken(testUser.id);
  });

  afterEach(async () => {
    await testUtils.cleanupTestData();
  });

  describe('GET /api/workflows', () => {
    test('获取工作流列表成功', async () => {
      // 创建测试工作流
      await testUtils.createTestWorkflow({
        title: '测试工作流1',
        status: 'published'
      });
      await testUtils.createTestWorkflow({
        title: '测试工作流2',
        status: 'published'
      });

      const response = await request(app)
        .get('/api/workflows')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(2);
    });

    test('分页参数正确处理', async () => {
      // 创建多个工作流
      for (let i = 0; i < 15; i++) {
        await testUtils.createTestWorkflow({
          title: `测试工作流${i}`,
          status: 'published'
        });
      }

      const response = await request(app)
        .get('/api/workflows?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBe(15);
    });

    test('搜索功能正常工作', async () => {
      await testUtils.createTestWorkflow({
        title: 'React工作流',
        description: '用于React开发的工作流',
        status: 'published'
      });
      await testUtils.createTestWorkflow({
        title: 'Vue工作流',
        description: '用于Vue开发的工作流',
        status: 'published'
      });

      const response = await request(app)
        .get('/api/workflows?search=React')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].title).toContain('React');
    });

    test('分类筛选正常工作', async () => {
      await testUtils.createTestWorkflow({
        category: 'frontend',
        status: 'published'
      });
      await testUtils.createTestWorkflow({
        category: 'backend',
        status: 'published'
      });

      const response = await request(app)
        .get('/api/workflows?category=frontend')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].category).toBe('frontend');
    });
  });

  describe('GET /api/workflows/:id', () => {
    test('获取单个工作流成功', async () => {
      const testWorkflow = await testUtils.createTestWorkflow({
        title: '详细工作流',
        description: '这是一个详细的工作流描述',
        status: 'published'
      });

      const response = await request(app)
        .get(`/api/workflows/${testWorkflow.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testWorkflow.id);
      expect(response.body.data.title).toBe(testWorkflow.title);
      expect(response.body.data.description).toBe(testWorkflow.description);
    });

    test('获取不存在的工作流返回404', async () => {
      const response = await request(app)
        .get('/api/workflows/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('未找到');
    });

    test('获取草稿状态工作流需要权限', async () => {
      const testWorkflow = await testUtils.createTestWorkflow({
        status: 'draft',
        authorId: 'other-user-id' // 不是当前用户
      });

      const response = await request(app)
        .get(`/api/workflows/${testWorkflow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/workflows (创建工作流)', () => {
    test('管理员创建工作流成功', async () => {
      // 创建管理员用户
      const adminUser = await testUtils.createTestUser({
        email: 'admin@wz.com',
        username: 'admin'
      });
      const adminToken = testUtils.generateTestToken(adminUser.id);

      const workflowData = {
        title: '新工作流',
        description: '这是一个新的工作流',
        category: 'test',
        price: 99.99,
        tags: ['tag1', 'tag2']
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(workflowData.title);
      expect(response.body.data.price).toBe(workflowData.price);
    });

    test('普通用户创建工作流失败', async () => {
      const workflowData = {
        title: '新工作流',
        description: '这是一个新的工作流'
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('权限');
    });

    test('未认证用户创建工作流失败', async () => {
      const workflowData = {
        title: '新工作流',
        description: '这是一个新的工作流'
      };

      const response = await request(app)
        .post('/api/workflows')
        .send(workflowData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

