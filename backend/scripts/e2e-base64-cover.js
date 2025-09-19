#!/usr/bin/env node

import { request } from 'http';
import { URL } from 'url';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + (parsedUrl.search || ''),
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: options.timeout || 15000,
    };

    const req = request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const contentType = res.headers['content-type'] || '';
        const isJson = contentType.includes('application/json');
        const body = isJson && data ? JSON.parse(data) : data;
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

function logStep(title) {
  console.log(`\n=== ${title} ===`);
}

(async () => {
  try {
    logStep('健康检查');
    const health = await makeRequest(`${API_BASE}/health`);
    console.log('health', health.status, health.body?.status || health.body);

    logStep('管理员登录');
    const login = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: 'admin@wz.com', password: '123456' },
    });
    if (!login.ok || !login.body?.data?.token) {
      throw new Error(`登录失败: ${login.status} ${JSON.stringify(login.body)}`);
    }
    const token = login.body.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    logStep('创建带 base64 封面的工作流');
    // 1x1 红色像素JPEG
    const BASE64_JPEG =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEA8QDw8PDw8PDw8PDw8PDw8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGi0fHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAKABJAMBIgACEQEDEQH/xAAbAAACAgMBAAAAAAAAAAAAAAAEBQMGAAECB//EAD4QAAIBAgQDBgQFAwMFAAAAAAECAwQRAAUSIRMxQQYTIlFhcYGRBxQyobHB0fAjQlLh8RUjYnKi/8QAGAEBAQEBAQAAAAAAAAAAAAAAAAECAwT/xAAhEQEBAAICAgMBAQAAAAAAAAAAAQIRAxIhMQQTIkJRof/aAAwDAQACEQMRAD8A8m6u0m3w8fdVJ4m1m7Z0d0mQx0r7m7wYVd2Y7gkBiBz4fB1i2s1Wv8A2hzjGzjcv3n9B7Z6b6t90a6Z4W4yQ4a3Jm1f0mQxkzGv4kLQ0Vx2+qk2E3h0QpWQpGqZQYzj0f7KfVb5Q3V0K5z9VSKzGdV2Zdy8k9oXz0G3yH8YfZfWk8tXzLwS5+Gv0Y9Y3W+e6qjz1M5rM5H2kQW6uFlk4CkYH3x8m2w6m4r9uVg3bZfW+2u7V1bq2nJ5c7Nn7v0mQwTqM8j3mN7kqUqR8n4n1XHq0nM3wX2l+zj1XoV9n5m3rD4MZ8vQ+lv2J4K3T1s1xCq0pUqUpSlKUpSlKUpX/2Q==';

    const title = `Base64封面测试-${Date.now()}`;
    const create = await makeRequest(`${API_BASE}/api/admin/workflows`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        title,
        description: '自动化测试: base64 封面写盘',
        isFree: true,
        price: 0,
        status: 'draft',
        category: 'tools',
        cover: BASE64_JPEG,
      },
    });

    console.log('create', create.status, create.body);
    if (!create.ok) throw new Error('创建失败');

    console.log('\n🎉 测试提交完成。请在 backend/uploads/workflows/<code>/images 下查看是否有 cover-*.jpg 文件。');
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    process.exit(1);
  }
})();


