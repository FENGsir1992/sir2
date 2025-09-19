@echo off
setlocal

REM Detect workspace root (this script located at workspace root)
set ROOT=%~dp0

REM Portable PowerShell path
set PWSH=C:\Users\Administrator\pwsh74\pwsh.exe

if not exist "%PWSH%" (
  echo [ERROR] Portable PowerShell not found: %PWSH%
  echo Please run install-portable-pwsh.ps1 first.
  pause
  exit /b 1
)

REM Run quick fix script silently without profile
"%PWSH%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\.vscode\quick-fix-terminal.ps1"

if %errorlevel% neq 0 (
  echo [WARN] Quick fix returned non-zero exit code: %errorlevel%
) else (
  echo [OK] Quick fix completed.
)

pause
endlocal
