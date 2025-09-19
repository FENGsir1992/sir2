#!/usr/bin/env node

/**
 * 安全修复验证脚本
 * 验证支付接口权限控制是否生效
 */

const API_BASE = 'http://localhost:3001/api';

// 模拟两个不同的用户
const USER_A_TOKEN = 'mock_token_user_a';
const USER_B_TOKEN = 'mock_token_user_b';
const USER_B_ORDER_ID = 'user_b_order_123';

async function testWechatPaySecurity() {
  console.log('🔒 测试微信支付接口权限控制...');
  
  try {
    const response = await fetch(`${API_BASE}/pay/wechat/native`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_A_TOKEN}`
      },
      body: JSON.stringify({
        orderId: USER_B_ORDER_ID  // 用户A尝试为用户B的订单创建支付
      })
    });
    
    const result = await response.json();
    
    if (response.status === 404 && result.error?.includes('无权限操作')) {
      console.log('✅ 微信支付权限控制正常 - 成功阻止越权操作');
      return true;
    } else {
      console.log('❌ 微信支付权限控制失败 - 存在越权风险');
      console.log('响应:', result);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  服务器未启动，无法测试');
      return null;
    }
    console.log('❌ 测试失败:', error.message);
    return false;
  }
}

async function testAlipayPaySecurity() {
  console.log('🔒 测试支付宝支付接口权限控制...');
  
  try {
    const response = await fetch(`${API_BASE}/pay/alipay/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_A_TOKEN}`
      },
      body: JSON.stringify({
        orderId: USER_B_ORDER_ID,  // 用户A尝试为用户B的订单创建支付
        type: 'page'
      })
    });
    
    const result = await response.json();
    
    if (response.status === 404 && result.error?.includes('无权限操作')) {
      console.log('✅ 支付宝支付权限控制正常 - 成功阻止越权操作');
      return true;
    } else {
      console.log('❌ 支付宝支付权限控制失败 - 存在越权风险');
      console.log('响应:', result);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  服务器未启动，无法测试');
      return null;
    }
    console.log('❌ 测试失败:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始安全修复验证测试\n');
  
  const wechatResult = await testWechatPaySecurity();
  console.log('');
  const alipayResult = await testAlipayPaySecurity();
  
  console.log('\n📊 测试结果汇总:');
  console.log(`微信支付权限控制: ${wechatResult === true ? '✅ 通过' : wechatResult === false ? '❌ 失败' : '⚠️ 跳过'}`);
  console.log(`支付宝支付权限控制: ${alipayResult === true ? '✅ 通过' : alipayResult === false ? '❌ 失败' : '⚠️ 跳过'}`);
  
  if (wechatResult === true && alipayResult === true) {
    console.log('\n🎉 所有安全修复验证通过！');
  } else if (wechatResult === null || alipayResult === null) {
    console.log('\n⚠️  请启动后端服务器后重新测试');
    console.log('启动命令: cd backend && npm run dev');
  } else {
    console.log('\n⚠️  部分安全修复可能未生效，请检查代码');
  }
}

main().catch(console.error);
