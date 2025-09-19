#!/usr/bin/env node

/**
 * API端点测试脚本
 * 运行方式: node backend/scripts/test-api.js
 */

// 简单的HTTP请求函数（使用Node.js内置模块）
import { request } from 'http';
import { URL } from 'url';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          headers: { get: (name) => res.headers[name.toLowerCase()] },
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

const API_BASE = 'http://localhost:3001';

async function testEndpoints() {
  console.log('🧪 测试API端点连接性...\n');

  const tests = [
    {
      name: '健康检查',
      url: `${API_BASE}/health`,
      method: 'GET'
    },
    {
      name: '登录API可达性',
      url: `${API_BASE}/api/auth/login`,
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'testpassword'
      }
    },
  ];

  for (const test of tests) {
    try {
      console.log(`🔍 测试: ${test.name}`);
      console.log(`   URL: ${test.url}`);

      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await makeRequest(test.url, options);
      const data = await response.text();

      console.log(`   状态码: ${response.status}`);
      console.log(`   响应头: ${response.headers.get('content-type')}`);
      
      // 尝试解析JSON
      try {
        const jsonData = JSON.parse(data);
        console.log(`   响应: ${JSON.stringify(jsonData, null, 2).substring(0, 200)}...`);
      } catch {
        console.log(`   响应: ${data.substring(0, 200)}...`);
      }

      if (response.ok) {
        console.log('   ✅ 成功');
      } else {
        console.log('   ⚠️  HTTP错误，但端点可达');
      }

    } catch (error) {
      console.log(`   ❌ 连接失败: ${error.message}`);
    }
    
    console.log(''); // 空行分隔
  }
}

async function testLogin() {
  console.log('🔐 测试管理员登录...\n');

  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@wz.com',
        password: '123456'
      })
    });

    const data = await response.json();
    console.log(`状态码: ${response.status}`);
    console.log(`响应:`, JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('✅ 管理员登录成功！');
      
      // 测试管理员权限
      const token = data.data.token;
      console.log('\n🔒 测试管理员权限...');
      
      console.log('✅ 管理员权限验证跳过（工作流API已移除）');

    } else {
      console.log('❌ 管理员登录失败');
    }

  } catch (error) {
    console.log(`❌ 登录测试失败: ${error.message}`);
  }
}

async function main() {
  await testEndpoints();
  await testLogin();
}

main().catch(console.error);
