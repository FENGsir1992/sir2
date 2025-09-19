@echo off
setlocal enabledelayedexpansion

REM 切换到脚本所在目录
cd /d %~dp0

echo 正在编译后端 TypeScript 代码...
call npm run build
if %errorlevel% neq 0 (
    echo 编译失败！
    pause
    exit /b %errorlevel%
)

echo 清理迁移和种子文件中的.d.ts文件...
del /q dist\database\migrations\*.d.ts 2>nul
del /q dist\database\seeds\*.d.ts 2>nul

echo 启动服务器...
"%USERPROFILE%\pwsh74\pwsh.exe" -NoLogo -NoProfile -Command "node dist/server.js"
pause
