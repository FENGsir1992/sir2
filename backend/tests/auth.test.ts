import request from 'supertest';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../src/server.js';
import { testUtils } from './setup.js';

describe('认证API测试', () => {
  beforeEach(async () => {
    await testUtils.cleanupTestData();
  });

  afterEach(async () => {
    await testUtils.cleanupTestData();
  });

  describe('POST /api/auth/register', () => {
    test('成功注册新用户', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    test('邮箱已存在时注册失败', async () => {
      // 先创建一个用户
      await testUtils.createTestUser({
        email: 'existing@example.com'
      });

      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('邮箱已被使用');
    });

    test('密码强度不足时注册失败', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: '123' // 弱密码
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('密码');
    });
  });

  describe('POST /api/auth/login', () => {
    test('正确凭据登录成功', async () => {
      // 创建测试用户
      const testUser = await testUtils.createTestUser({
        email: 'test@example.com',
        passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // "password"的hash
      });

      const loginData = {
        email: 'test@example.com',
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
    });

    test('错误密码登录失败', async () => {
      await testUtils.createTestUser({
        email: 'test@example.com'
      });

      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('邮箱或密码错误');
    });

    test('不存在的邮箱登录失败', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('邮箱或密码错误');
    });
  });

  describe('GET /api/auth/profile', () => {
    test('有效token获取用户资料成功', async () => {
      const testUser = await testUtils.createTestUser();
      const token = testUtils.generateTestToken(testUser.id);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.email).toBe(testUser.email);
    });

    test('无token访问失败', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('认证');
    });

    test('无效token访问失败', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });
  });
});

