// 验证修复的脚本 - 通过HTTP请求测试
const http = require('http');

console.log('🧪 验证 base64 图片处理修复...');

// 测试数据
const testData = JSON.stringify({
  title: 'Base64测试工作流',
  description: '验证图片处理',
  price: 0,
  isFree: true,
  isVip: false,
  cover: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9hFOGQwAAAABJRU5ErkJggg==',
  category: 'other',
  status: 'draft'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/workflows',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData),
    'Authorization': 'Bearer test-token'
  }
};

console.log('🚀 发送测试请求...');

const req = http.request(options, (res) => {
  console.log(`📊 状态码: ${res.statusCode}`);
  console.log(`📊 响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📊 响应内容:', data);
    
    if (res.statusCode === 201) {
      console.log('✅ 请求成功！');
      
      try {
        const result = JSON.parse(data);
        const workflowCode = result.data?.code;
        if (workflowCode) {
          console.log(`🏷️  创建的工作流代码: ${workflowCode}`);
          
          // 检查文件系统
          const fs = require('fs');
          const path = require('path');
          
          // 检查两个可能的路径
          const paths = [
            path.join(__dirname, 'uploads', 'workflows', workflowCode.toString(), 'images'),
            path.join(__dirname, 'src', 'uploads', 'workflows', workflowCode.toString(), 'images')
          ];
          
          paths.forEach((imgPath, i) => {
            console.log(`📁 检查路径 ${i+1}: ${imgPath}`);
            if (fs.existsSync(imgPath)) {
              const files = fs.readdirSync(imgPath);
              console.log(`  ✅ 目录存在，文件数量: ${files.length}`);
              if (files.length > 0) {
                console.log(`  📄 文件: ${files.join(', ')}`);
                console.log('🎉 成功！Base64 图片已保存！');
              } else {
                console.log('  ❌ 目录存在但无文件');
              }
            } else {
              console.log(`  ❌ 目录不存在`);
            }
          });
        }
      } catch (e) {
        console.log('⚠️  解析响应失败:', e.message);
      }
    } else {
      console.log('❌ 请求失败');
    }
  });
});

req.on('error', (e) => {
  console.error(`💥 请求错误: ${e.message}`);
});

req.write(testData);
req.end();


