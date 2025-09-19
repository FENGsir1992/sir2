@echo off 
echo 🧪 快速API测试... 
curl -s http://localhost:3001/health || "%USERPROFILE%\pwsh74\pwsh.exe" -NoLogo -NoProfile -Command "Invoke-RestMethod -Uri 'http://localhost:3001/health'" 
pause 
