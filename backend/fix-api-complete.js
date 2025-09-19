#!/usr/bin/env node

/**
 * 完整的API修复和诊断脚本
 * 彻底解决socket hang up和连接问题
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { request } from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP请求函数，增加重试和超时处理
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: options.method || 'GET',
            timeout: options.timeout || 10000,
            headers: {
                'Content-Type': 'application/json',
                'Connection': 'close', // 强制关闭连接
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

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// 等待函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 检查端口是否被占用
async function checkPortUsage(port) {
    try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        return stdout.trim().split('\n').filter(line => line.includes('LISTENING'));
    } catch (error) {
        return [];
    }
}

// 终止占用端口的进程
async function killProcessOnPort(port) {
    try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5 && parts[4] !== '0') {
                pids.add(parts[4]);
            }
        }

        for (const pid of pids) {
            try {
                await execAsync(`taskkill /F /PID ${pid}`);
                log(`✅ 终止进程 PID: ${pid}`, 'green');
            } catch (error) {
                log(`⚠️  无法终止进程 PID: ${pid}`, 'yellow');
            }
        }
    } catch (error) {
        log(`检查端口占用时出错: ${error.message}`, 'yellow');
    }
}

// 等待端口可用
async function waitForPort(port, maxWait = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
        const usage = await checkPortUsage(port);
        if (usage.length === 0) {
            return true;
        }
        await sleep(1000);
    }
    return false;
}

// 启动服务器
function startServer() {
    return new Promise((resolve, reject) => {
        log('🚀 启动后端服务器...', 'cyan');
        
        const server = spawn('pwsh', ['-NoLogo', '-NoProfile', '-Command', 'npm run dev'], {
            stdio: ['inherit', 'pipe', 'pipe'],
        });

        let serverReady = false;
        let output = '';

        server.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            process.stdout.write(text);
            
            if (text.includes('服务器运行在') || text.includes('Server running')) {
                serverReady = true;
                resolve(server);
            }
        });

        server.stderr.on('data', (data) => {
            const text = data.toString();
            output += text;
            process.stderr.write(text);
        });

        server.on('close', (code) => {
            if (!serverReady) {
                reject(new Error(`服务器启动失败，退出代码: ${code}`));
            }
        });

        server.on('error', (error) => {
            reject(new Error(`启动服务器时出错: ${error.message}`));
        });

        // 30秒超时
        setTimeout(() => {
            if (!serverReady) {
                server.kill();
                reject(new Error('服务器启动超时'));
            }
        }, 30000);
    });
}

// 测试API连接（带重试）
async function testApiWithRetry(url, maxRetries = 5, retryDelay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            log(`🔍 尝试连接 ${url} (${i + 1}/${maxRetries})`, 'cyan');
            
            const response = await makeRequest(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'WZ-API-Test/1.0'
                }
            });
            
            const data = await response.text();
            log(`✅ 连接成功! 状态码: ${response.status}`, 'green');
            
            try {
                const jsonData = JSON.parse(data);
                log(`📊 响应数据: ${JSON.stringify(jsonData, null, 2)}`, 'blue');
            } catch {
                log(`📄 响应文本: ${data.substring(0, 200)}`, 'blue');
            }
            
            return { success: true, response, data };
            
        } catch (error) {
            log(`❌ 连接失败 (${i + 1}/${maxRetries}): ${error.message}`, 'red');
            
            if (i < maxRetries - 1) {
                log(`⏳ ${retryDelay/1000}秒后重试...`, 'yellow');
                await sleep(retryDelay);
            }
        }
    }
    
    return { success: false };
}

// 主修复流程
async function main() {
    log('🔧 开始完整的API修复流程...', 'magenta');
    
    try {
        // 1. 检查环境
        log('\n📋 步骤 1: 检查环境配置', 'cyan');
        
        // 检查Node.js版本
        const { stdout: nodeVersion } = await execAsync('node --version');
        log(`Node.js 版本: ${nodeVersion.trim()}`, 'blue');
        
        // 检查npm版本
        const { stdout: npmVersion } = await execAsync('npm --version');
        log(`npm 版本: ${npmVersion.trim()}`, 'blue');
        
        // 检查数据库文件
        const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            log(`数据库文件存在: ${dbPath} (${Math.round(stats.size/1024)}KB)`, 'green');
        } else {
            log(`数据库文件不存在: ${dbPath}`, 'red');
        }
        
        // 2. 清理端口
        log('\n🧹 步骤 2: 清理端口占用', 'cyan');
        const portUsage = await checkPortUsage(3001);
        if (portUsage.length > 0) {
            log('发现端口3001被占用:', 'yellow');
            portUsage.forEach(line => log(`  ${line}`, 'yellow'));
            
            await killProcessOnPort(3001);
            
            log('等待端口释放...', 'yellow');
            const portFree = await waitForPort(3001, 10000);
            if (portFree) {
                log('✅ 端口3001已释放', 'green');
            } else {
                log('⚠️  端口3001仍被占用，但继续尝试', 'yellow');
            }
        } else {
            log('✅ 端口3001未被占用', 'green');
        }
        
        // 3. 启动服务器
        log('\n🚀 步骤 3: 启动后端服务器', 'cyan');
        const server = await startServer();
        
        // 等待服务器完全启动
        log('⏳ 等待服务器完全启动...', 'yellow');
        await sleep(5000);
        
        // 4. 测试API连接
        log('\n🧪 步骤 4: 测试API连接', 'cyan');
        
        // 测试健康检查
        const healthResult = await testApiWithRetry('http://localhost:3001/health');
        
        if (healthResult.success) {
            log('✅ 健康检查通过!', 'green');
            
            // 测试登录API
            log('\n🔐 测试登录API...', 'cyan');
            try {
                const loginResult = await testApiWithRetry('http://localhost:3001/api/auth/login', 3, 1000);
                if (loginResult.success) {
                    log('✅ 登录API可访问', 'green');
                } else {
                    log('⚠️  登录API不可访问，但这可能是正常的（需要POST数据）', 'yellow');
                }
            } catch (error) {
                log(`登录API测试出错: ${error.message}`, 'yellow');
            }
            
            log('\n🎉 API修复完成!', 'green');
            log('服务器正在后台运行，按 Ctrl+C 停止', 'cyan');
            
            // 保持服务器运行
            process.on('SIGINT', () => {
                log('\n🛑 收到停止信号，关闭服务器...', 'yellow');
                server.kill();
                process.exit(0);
            });
            
            // 定期检查服务器状态
            const healthCheck = setInterval(async () => {
                try {
                    await makeRequest('http://localhost:3001/health', { timeout: 5000 });
                } catch (error) {
                    log(`⚠️  服务器健康检查失败: ${error.message}`, 'red');
                }
            }, 30000);
            
        } else {
            log('❌ API连接失败，服务器可能有问题', 'red');
            server.kill();
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ 修复过程中出现错误: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// 运行主流程
main().catch(console.error);
