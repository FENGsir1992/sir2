@echo off
echo 🧪 测试API连接...
cd backend
"%USERPROFILE%\pwsh74\pwsh.exe" -NoLogo -NoProfile -Command "node scripts/test-api.js"
pause
