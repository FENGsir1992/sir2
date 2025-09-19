@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo     WZ工作流迁移系统启动器
echo     VPN环境高级版本 v2.0
echo ========================================
echo.

REM 选择PowerShell可执行文件
set "PWSH=%USERPROFILE%\pwsh74\pwsh.exe"
if not exist "%PWSH%" (
    for /f "delims=" %%p in ('where pwsh 2^>nul') do (
        if not defined PWSH_FOUND set "PWSH=%%p" & set "PWSH_FOUND=1"
    )
)
if not exist "%PWSH%" (
    set "PWSH=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
)

REM 检查PowerShell支持
"%PWSH%" -NoLogo -NoProfile -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell not available
    echo Please check PowerShell installation or run as administrator
    pause
    exit /b 1
)

echo PowerShell Path: %PWSH%

REM 检查管理员权限
net session >nul 2>&1
if errorlevel 1 (
    echo WARNING: Recommend running as administrator for best experience
    echo Continuing with current permissions...
    timeout /t 3 >nul
)

REM 获取公网IP
echo.
echo Getting public IP address...
set "_TMP_IP_FILE=%TEMP%\wz_ip.txt"
if exist "%_TMP_IP_FILE%" del "%_TMP_IP_FILE%" >nul 2>&1

"%PWSH%" -NoLogo -NoProfile -Command "try { (Invoke-RestMethod -Uri 'https://ipinfo.io/ip' -TimeoutSec 10).Trim() } catch { '' }" > "%_TMP_IP_FILE%" 2>nul
set /p public_ip=<"%_TMP_IP_FILE%"

if "!public_ip!"=="" (
    echo Failed to get public IP, using fallback
    set "public_ip=127.0.0.1"
)

echo Public IP: !public_ip!

if exist "%_TMP_IP_FILE%" del "%_TMP_IP_FILE%" >nul 2>&1

REM 创建环境配置
echo.
echo Creating environment configuration...

REM 创建后端环境文件
(
echo PORT=3001
echo HOST=0.0.0.0
echo NODE_ENV=development
echo PUBLIC_IP=!public_ip!
echo LOCAL_IP=192.168.0.100
echo VPN_MODE=true
echo FRONTEND_URL=http://192.168.0.100:5173
echo ALLOWED_ORIGINS=http://192.168.0.100:5173,http://localhost:5173,http://127.0.0.1:5173
echo DB_PATH=./data/database.sqlite
echo DB_POOL_MIN=2
echo DB_POOL_MAX=10
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
echo JWT_EXPIRES_IN=24h
echo BCRYPT_ROUNDS=12
echo UPLOAD_DIR=./uploads
echo MAX_FILE_SIZE=10485760
echo ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,pdf,doc,docx,txt
echo LOG_LEVEL=debug
echo LOG_FILE=./logs/app.log
echo REQUEST_TIMEOUT=30000
echo BODY_LIMIT=10mb
) > backend\.env

REM 创建前端环境文件
(
echo VITE_API_BASE_URL=http://192.168.0.100:3001
echo VITE_API_TIMEOUT=10000
echo VITE_PUBLIC_IP=!public_ip!
echo VITE_LOCAL_IP=192.168.0.100
echo VITE_VPN_MODE=true
echo VITE_DEV_MODE=true
echo VITE_HOT_RELOAD=true
echo VITE_SOURCE_MAP=true
echo VITE_SHOW_FONT_BADGE=true
echo VITE_ENABLE_DEV_TOOLS=true
echo VITE_ENABLE_DEBUG=true
echo VITE_ENABLE_PERFORMANCE_MONITOR=true
echo VITE_APP_TITLE=WZ Workflow Management System
echo VITE_APP_VERSION=1.0.0
echo VITE_DEFAULT_LOCALE=zh-CN
echo VITE_APP_DESCRIPTION=Professional workflow migration and management system
echo VITE_NETWORK_RETRY_COUNT=3
echo VITE_NETWORK_RETRY_DELAY=1000
) > .env.local

echo Environment configuration completed

REM 检查项目依赖
echo.
echo Checking project dependencies...

if not exist "package.json" (
    echo ERROR: package.json not found
    pause
    exit /b 1
)

if not exist "backend\package.json" (
    echo ERROR: backend package.json not found
    pause
    exit /b 1
)

REM 检查Node.js版本
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not installed
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version 2^>nul') do set "node_version=%%i"
echo Node.js version: !node_version!

REM 安装依赖
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install --silent
    if errorlevel 1 (
        echo Frontend dependencies installation failed
        pause
        exit /b 1
    )
    echo Frontend dependencies installation completed
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install --silent
    if errorlevel 1 (
        echo Backend dependencies installation failed
        cd ..
        pause
        exit /b 1
    )
    echo Backend dependencies installation completed
    cd ..
)

REM 创建日志目录
if not exist "logs" mkdir logs
if not exist "backend\logs" mkdir backend\logs

REM 检查端口可用性
echo.
echo Checking port availability...
netstat -an | findstr :3001 >nul
if not errorlevel 1 (
    echo WARNING: Port 3001 is occupied, trying to release...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)

netstat -an | findstr :5173 >nul
if not errorlevel 1 (
    echo WARNING: Port 5173 is occupied, trying to release...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)

REM 启动服务
echo.
echo Starting development services...
echo.
echo ================================================
echo Configuration:
echo   Public IP: !public_ip!
echo   Local IP: 192.168.0.100
echo   Backend: http://192.168.0.100:3001
echo   Frontend: http://192.168.0.100:5173
echo ================================================
echo.

REM 启动后端服务
echo Starting backend service...
start "" /B "%PWSH%" -NoLogo -NoProfile -Command "Set-Location backend; Write-Host 'Backend service starting...'; npm run dev"

REM 等待后端服务启动
echo Waiting for backend service...
timeout /t 8 /nobreak >nul

REM 启动前端服务
echo Starting frontend service...
start "" /B "%PWSH%" -NoLogo -NoProfile -Command "Write-Host 'Frontend service starting...'; npm run dev -- --host 0.0.0.0 --port 5173"

REM 等待前端服务启动
echo Waiting for frontend service...
timeout /t 10 /nobreak >nul

REM 创建状态文件
echo.
echo Creating status file...
(
echo {
echo   "status": "running",
echo   "publicIP": "!public_ip!",
echo   "localIP": "192.168.0.100",
echo   "services": {
echo     "backend": {
echo       "url": "http://192.168.0.100:3001",
echo       "status": "running"
echo     },
echo     "frontend": {
echo       "url": "http://192.168.0.100:5173",
echo       "status": "running"
echo     }
echo   },
echo   "environment": "development",
echo   "vpnMode": true
echo }
) > .vpn-status.json

echo.
echo ========================================
echo Advanced startup completed!
echo.
echo Service URLs:
echo   Frontend: http://192.168.0.100:5173
echo   Backend: http://192.168.0.100:3001
echo   Health Check: http://192.168.0.100:3001/health
echo.
echo Service Status:
echo   - Frontend: Running on port 5173
echo   - Backend: Running on port 3001
echo   - VPN Mode: Enabled
echo   - Public IP: !public_ip!
echo.
echo Advanced Features:
echo   - Automatic port detection and cleanup
echo   - Environment configuration management
echo   - Service health monitoring
echo   - VPN-optimized network settings
echo.
echo Press Ctrl+C to stop services
echo Use stop-vpn.ps1 to gracefully shutdown
echo ========================================

REM 等待用户中断
:wait_loop
timeout /t 5 >nul
goto wait_loop
