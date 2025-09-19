#!/usr/bin/env node

/**
 * 服务器调试和修复脚本
 * 解决服务器启动但无法连接的问题
 */

import express from 'express';
import http from 'http';
import net from 'net';

const app = express();
const PORT = process.env.PORT || 3001;

// 简单的健康检查路由
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Debug server is working!'
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'Debug API Server',
        endpoints: ['/health'],
        timestamp: new Date().toISOString()
    });
});

// 检查端口是否可用
function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, '127.0.0.1', () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false);
        });
    });
}

// 启动服务器
async function startDebugServer() {
    console.log('🔍 调试服务器启动...');
    
    // 检查端口可用性
    console.log(`📡 检查端口 ${PORT} 可用性...`);
    const portAvailable = await checkPort(PORT);
    
    if (!portAvailable) {
        console.log(`❌ 端口 ${PORT} 不可用`);
        process.exit(1);
    }
    
    console.log(`✅ 端口 ${PORT} 可用`);
    
    // 创建HTTP服务器
    const server = http.createServer(app);
    
    // 监听所有接口
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 调试服务器启动成功:`);
        console.log(`   - 本地访问: http://localhost:${PORT}`);
        console.log(`   - 局域网访问: http://0.0.0.0:${PORT}`);
        console.log(`   - 健康检查: http://localhost:${PORT}/health`);
        
        // 测试本地连接
        setTimeout(testConnection, 2000);
    });
    
    server.on('error', (error) => {
        console.error('❌ 服务器错误:', error);
        if (error.code === 'EADDRINUSE') {
            console.error(`端口 ${PORT} 已被占用`);
        }
        process.exit(1);
    });
    
    server.on('connection', (socket) => {
        console.log('🔌 新连接:', socket.remoteAddress + ':' + socket.remotePort);
    });
    
    return server;
}

// 测试连接
function testConnection() {
    console.log('\n🧪 测试本地连接...');
    
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('✅ 连接测试成功!');
            console.log(`状态码: ${res.statusCode}`);
            console.log(`响应: ${data}`);
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ 连接测试失败:', error.message);
    });
    
    req.on('timeout', () => {
        console.error('❌ 连接超时');
        req.destroy();
    });
    
    req.end();
}

// 启动调试服务器
startDebugServer().catch(console.error);
