# Cursor 终端完全重置脚本
# 解决终端卡死、转圈等问题

param(
    [switch]$Backup = $true
)

Write-Host "=== Cursor 终端完全重置 ===" -ForegroundColor Cyan

# 1. 备份现有配置
if ($Backup) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = ".vscode/backup-$timestamp"
    
    if (Test-Path ".vscode") {
        Write-Host "`n📦 备份现有配置到 $backupDir" -ForegroundColor Yellow
        Copy-Item ".vscode" $backupDir -Recurse -Force
        Write-Host "✅ 配置已备份" -ForegroundColor Green
    }
}

# 2. 停止相关进程
Write-Host "`n🛑 停止相关进程..." -ForegroundColor Yellow
$processesToStop = @('Cursor', 'Code')
foreach ($proc in $processesToStop) {
    $processes = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "停止 $proc 进程..." -ForegroundColor Gray
        $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# 3. 清理缓存
Write-Host "`n🧹 清理缓存..." -ForegroundColor Yellow
$cachePaths = @(
    "$env:APPDATA\Cursor\User\workspaceStorage",
    "$env:APPDATA\Cursor\logs",
    "$env:APPDATA\Cursor\CachedExtensions",
    "$env:APPDATA\Code\User\workspaceStorage",
    "$env:APPDATA\Code\logs"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Write-Host "清理: $path" -ForegroundColor Gray
        try {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "警告: 无法完全清理 $path" -ForegroundColor Yellow
        }
    }
}

# 4. 重置环境变量
Write-Host "`n🔧 重置环境变量..." -ForegroundColor Yellow
$pwshPath = "C:/Users/Administrator/pwsh74/pwsh.exe"

if (Test-Path $pwshPath) {
    $env:SHELL = $pwshPath
    $env:PSExecutionPolicyPreference = "Bypass"
    $env:COMSPEC = $pwshPath
    Write-Host "✅ 环境变量已重置" -ForegroundColor Green
} else {
    Write-Host "❌ PowerShell 7 不存在，请先安装" -ForegroundColor Red
    Write-Host "运行: .\install-portable-pwsh.ps1" -ForegroundColor Yellow
    exit 1
}

# 5. 创建最小化配置
Write-Host "`n📝 创建最小化配置..." -ForegroundColor Yellow

$minimalSettings = @{
    "terminal.integrated.defaultProfile.windows" = "PowerShell 7"
    "terminal.integrated.profiles.windows" = @{
        "PowerShell 7" = @{
            "path" = $pwshPath
            "args" = @("-NoLogo")
        }
    }
    "terminal.integrated.shellIntegration.enabled" = $true
    "terminal.integrated.persistentSessionReviveProcess" = "onExitAndWindowClose"
    "terminal.integrated.showExitAlert" = $false
    "terminal.integrated.confirmOnExit" = "never"
    "powershell.powerShellDefaultVersion" = "PowerShell 7"
    "powershell.powerShellAdditionalExePaths" = @{
        "PowerShell 7" = $pwshPath
    }
}

$settingsJson = $minimalSettings | ConvertTo-Json -Depth 10
$settingsJson | Set-Content ".vscode/settings.json" -Encoding UTF8

Write-Host "✅ 最小化配置已创建" -ForegroundColor Green

# 6. 测试配置
Write-Host "`n🧪 测试新配置..." -ForegroundColor Yellow

try {
    $testResult = & $pwshPath -NoLogo -NonInteractive -Command "Write-Host 'Terminal Test OK'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PowerShell 测试通过" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PowerShell 测试有警告" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ PowerShell 测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 重置完成！" -ForegroundColor Green
Write-Host "`n📋 下一步操作:" -ForegroundColor White
Write-Host "1. 启动 Cursor" -ForegroundColor Gray
Write-Host "2. 打开终端 (Ctrl+`)" -ForegroundColor Gray
Write-Host "3. 如果仍有问题，运行: .\.vscode\fix-terminal-hang.ps1 -Deep" -ForegroundColor Gray

Write-Host "`n⚠️  注意:" -ForegroundColor Yellow
Write-Host "- 如果问题解决，可以运行 .\setup-cursor-powershell.ps1 恢复完整配置" -ForegroundColor Gray
Write-Host "- 备份文件位于 $backupDir" -ForegroundColor Gray


