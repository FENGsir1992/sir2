const fetch = require('node-fetch');

// 测试用的小图片 base64 数据（1x1像素的透明PNG）
const testBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9hFOGQwAAAABJRU5ErkJggg==';

async function testWorkflowCreation() {
  try {
    console.log('🧪 开始测试工作流创建...');
    console.log('📸 Base64 图片数据长度:', testBase64Image.length);
    console.log('📸 Base64 数据开头:', testBase64Image.substring(0, 50) + '...');
    
    // 构造测试数据
    const payload = {
      title: '测试工作流 - Base64 封面验证',
      description: '用于验证 base64 图片处理的测试工作流',
      shortDescription: 'Base64 测试',
      price: 0,
      isFree: true,
      isVip: false,
      isHot: false,
      cover: testBase64Image, // 这里是关键的 base64 数据
      previewVideo: '',
      demoVideo: '',
      gallery: [],
      category: 'other',
      status: 'draft'
    };

    console.log('🚀 发送请求到管理员 API...');
    
    // 发送请求到管理员 API
    const response = await fetch('http://localhost:3001/api/admin/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-admin-token', // 简化测试，实际环境需要真实token
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    
    console.log('📊 响应状态:', response.status);
    console.log('📊 响应内容:', result);
    
    if (response.status === 201) {
      console.log('✅ 工作流创建成功！');
      
      // 解析响应获取工作流代码
      try {
        const data = JSON.parse(result);
        const workflowCode = data.data?.code;
        if (workflowCode) {
          console.log('🏷️  工作流代码:', workflowCode);
          
          // 检查是否创建了目录
          const fs = require('fs');
          const path = require('path');
          const workflowDir = path.join(process.cwd(), 'uploads', 'workflows', workflowCode.toString());
          const imagesDir = path.join(workflowDir, 'images');
          
          console.log('📁 检查目录:', workflowDir);
          console.log('📁 目录存在:', fs.existsSync(workflowDir));
          console.log('📁 images目录存在:', fs.existsSync(imagesDir));
          
          if (fs.existsSync(imagesDir)) {
            const files = fs.readdirSync(imagesDir);
            console.log('📄 images目录中的文件:', files);
            if (files.length > 0) {
              console.log('🎉 成功！Base64 图片已保存到文件系统！');
            } else {
              console.log('❌ 问题：images目录存在但为空');
            }
          } else {
            console.log('❌ 问题：images目录不存在');
          }
        }
      } catch (parseError) {
        console.log('⚠️  无法解析响应数据:', parseError.message);
      }
    } else {
      console.log('❌ 工作流创建失败');
    }
    
  } catch (error) {
    console.error('💥 测试过程中出错:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testWorkflowCreation();


