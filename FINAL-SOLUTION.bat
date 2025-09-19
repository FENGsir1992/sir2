@echo off
chcp 65001 >nul
title WZ API 终极修复工具
color 0E

echo.
echo ████████████████████████████████████████████████████████████████
echo ██                                                            ██
echo ██                WZ API 终极修复工具 v3.0                   ██
echo ██                                                            ██
echo ████████████████████████████████████████████████████████████████
echo.

echo 🔧 开始完整的API修复流程...
echo.

REM 步骤1: 环境检查
echo [步骤 1/6] 检查环境配置...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Node.js
    echo 请从 https://nodejs.org 下载并安装 Node.js
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node --version') do set NODE_VERSION=%%v
echo ✅ Node.js 版本: %NODE_VERSION%

REM 步骤2: 清理端口
echo.
echo [步骤 2/6] 清理端口占用...
echo 🧹 终止所有占用端口3001的进程...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING 2^>nul') do (
    if "%%a" neq "0" (
        echo 🔄 终止进程 PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
)

REM 额外清理所有node进程
echo 🔄 清理所有Node.js进程...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM tsx.exe >nul 2>&1

echo ✅ 端口清理完成
timeout /t 3 /nobreak >nul

REM 步骤3: 进入目录
echo.
echo [步骤 3/6] 检查项目目录...
cd /d "%~dp0backend"
if not exist "package.json" (
    echo ❌ 找不到 backend/package.json
    echo 请确保脚本在项目根目录运行
    pause
    exit /b 1
)
echo ✅ 项目目录检查通过

REM 步骤4: 安装依赖
echo.
echo [步骤 4/6] 检查依赖包...
if not exist "node_modules" (
    echo 📦 安装依赖包...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo ✅ 依赖包已存在
)

REM 步骤5: 启动服务器
echo.
echo [步骤 5/6] 启动后端服务器...
echo 🚀 正在启动服务器，请等待...
echo.

start /min "%USERPROFILE%\pwsh74\pwsh.exe" -NoLogo -NoProfile -Command "npm run dev; Pause"

REM 等待服务器启动
echo ⏳ 等待服务器启动...
timeout /t 10 /nobreak >nul

REM 步骤6: 测试连接
echo.
echo [步骤 6/6] 测试API连接...
echo.

REM 使用curl测试（如果可用）
curl --version >nul 2>&1
if not errorlevel 1 (
    echo 🧪 使用 curl 测试健康检查端点...
    curl -s -o nul -w "HTTP状态码: %%{http_code}\n响应时间: %%{time_total}s\n" http://localhost:3001/health
    if not errorlevel 1 (
        echo ✅ API连接成功！
        goto :test_complete
    )
)

REM 使用PowerShell测试
echo 🧪 使用 PowerShell 测试API连接...
"%USERPROFILE%\pwsh74\pwsh.exe" -NoLogo -NoProfile -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:3001/health' -TimeoutSec 10; Write-Host '✅ API连接成功!'; $response | ConvertTo-Json } catch { Write-Host '❌ API连接失败:' $_.Exception.Message }"

:test_complete
echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo 🎉 修复流程完成！
echo.
echo 📋 服务信息:
echo    • 后端地址: http://localhost:3001
echo    • 健康检查: http://localhost:3001/health
echo    • API文档: http://localhost:3001/api
echo.
echo 💡 使用提示:
echo    • 后端服务正在后台运行
echo    • 如需停止服务，请关闭弹出的命令窗口
echo    • 如遇问题，请重新运行此脚本
echo.
echo 🔧 故障排除:
echo    • 检查防火墙设置
echo    • 确保端口3001未被其他程序占用
echo    • 以管理员身份运行此脚本
echo.
echo ════════════════════════════════════════════════════════════════
echo.

REM 创建快速测试脚本
echo @echo off > quick-test.bat
echo echo 🧪 快速API测试... >> quick-test.bat
echo curl -s http://localhost:3001/health ^|^| "%USERPROFILE%\pwsh74\pwsh.exe" -NoLogo -NoProfile -Command "Invoke-RestMethod -Uri 'http://localhost:3001/health'" >> quick-test.bat
echo pause >> quick-test.bat

echo 📄 已创建 quick-test.bat 用于快速测试
echo.

pause
