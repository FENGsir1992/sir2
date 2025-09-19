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
        ...options.headers
      },
      timeout: options.timeout || 15000,
    };

    const req = request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const contentType = res.headers['content-type'] || '';
        const isJson = contentType.includes('application/json');
        const body = isJson ? (data ? JSON.parse(data) : {}) : data;
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });

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
    console.log(health.status, health.body);

    logStep('管理员登录');
    const login = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: 'admin@wz.com', password: '123456' }
    });
    console.log(login.status, login.body?.success);
    if (!login.ok || !login.body?.data?.token) {
      throw new Error('登录失败，未获取到token');
    }
    const token = login.body.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    logStep('列表（空/已有数据）');
    let list = await makeRequest(`${API_BASE}/api/admin/workflows?page=1&limit=5`, { headers: authHeaders });
    console.log(list.status, Array.isArray(list.body?.data?.workflows) ? list.body.data.workflows.length : list.body);

    logStep('创建工作流');
    const title = `E2E测试-${Date.now()}`;
    const create = await makeRequest(`${API_BASE}/api/admin/workflows`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        title,
        description: '来自自动化脚本的测试工作流',
        price: 0,
        isFree: true,
        isVip: false,
        category: 'tools',
        status: 'draft'
      }
    });
    console.log(create.status, create.body?.success, create.body?.data);
    if (!create.ok) throw new Error('创建失败');
    const createdId = create.body?.data?.id;

    logStep('更新工作流');
    const update = await makeRequest(`${API_BASE}/api/admin/workflows/${createdId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: { status: 'published', shortDescription: '已发布', isHot: true }
    });
    console.log(update.status, update.body?.success);

    logStep('搜索验证');
    const search = await makeRequest(`${API_BASE}/api/admin/workflows?search=${encodeURIComponent(title)}&page=1&limit=5`, { headers: authHeaders });
    const found = Array.isArray(search.body?.data?.workflows) && search.body.data.workflows.find(w => w.id === createdId);
    console.log(search.status, !!found);

    logStep('分页验证');
    const page1 = await makeRequest(`${API_BASE}/api/admin/workflows?page=1&limit=1&sortBy=updatedAt&sortOrder=desc`, { headers: authHeaders });
    const page2 = await makeRequest(`${API_BASE}/api/admin/workflows?page=2&limit=1&sortBy=updatedAt&sortOrder=desc`, { headers: authHeaders });
    console.log('page1', page1.body?.data?.pagination, 'page2', page2.body?.data?.pagination);

    logStep('删除工作流（软删）');
    const del = await makeRequest(`${API_BASE}/api/admin/workflows/${createdId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(del.status, del.body?.success);

    console.log('\n🎉 E2E 测试完成');
  } catch (err) {
    console.error('❌ E2E 测试失败:', err.message);
    process.exit(1);
  }
})();
