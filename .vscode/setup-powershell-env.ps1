# PowerShell 环境配置脚本
# 此脚本用于确保整个项目环境都使用 PowerShell 7

param(
    [switch]$Verify = $false
)

$ErrorActionPreference = 'Stop'

# PowerShell 7 路径
$pwshPath = "C:/Users/Administrator/pwsh74/pwsh.exe"

Write-Host "=== PowerShell 7 环境配置脚本 ===" -ForegroundColor Cyan

if ($Verify) {
    Write-Host "`n正在验证 PowerShell 7 配置..." -ForegroundColor Yellow
    
    # 验证 PowerShell 7 是否存在
    if (Test-Path $pwshPath) {
        Write-Host "✓ PowerShell 7 可执行文件存在: $pwshPath" -ForegroundColor Green
        
        # 获取版本信息
        $version = & $pwshPath -NoLogo -NoProfile -NonInteractive -Command '$PSVersionTable.PSVersion.ToString()'
        Write-Host "✓ PowerShell 版本: $version" -ForegroundColor Green
    } else {
        Write-Host "✗ PowerShell 7 可执行文件不存在: $pwshPath" -ForegroundColor Red
        exit 1
    }
    
    # 验证配置文件
    $configFiles = @(
        ".vscode/settings.json",
        ".vscode/tasks.json", 
        ".vscode/launch.json",
        ".npmrc",
        "backend/.npmrc"
    )
    
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            Write-Host "✓ 配置文件存在: $file" -ForegroundColor Green
        } else {
            Write-Host "✗ 配置文件缺失: $file" -ForegroundColor Red
        }
    }
    
    Write-Host "`n=== 验证完成 ===" -ForegroundColor Cyan
    exit 0
}

Write-Host "`n正在设置环境变量..." -ForegroundColor Yellow

# 设置当前会话环境变量
$env:SHELL = $pwshPath
$env:PSExecutionPolicyPreference = "Bypass"
$env:POWERSHELL_DISTRIBUTION_CHANNEL = "MSI:Windows 10 Enterprise"

# 确保 npm 使用 PowerShell 7
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "✓ npm 配置设置为使用 PowerShell 7" -ForegroundColor Green
    npm config set script-shell $pwshPath
} else {
    Write-Host "! npm 未安装或不在 PATH 中" -ForegroundColor Yellow
}

# 验证配置
Write-Host "`n正在验证配置..." -ForegroundColor Yellow

# 检查当前 PowerShell 版本
if ($PSVersionTable.PSVersion.Major -ge 7) {
    Write-Host "✓ 当前运行 PowerShell $($PSVersionTable.PSVersion)" -ForegroundColor Green
} else {
    Write-Host "✗ 当前未运行 PowerShell 7" -ForegroundColor Red
}

# 测试并行功能（PowerShell 7 特性）
try {
    $testResult = 1..3 | ForEach-Object -Parallel { "Test $_" } -ThrottleLimit 2
    Write-Host "✓ PowerShell 7 并行功能测试成功" -ForegroundColor Green
} catch {
    Write-Host "✗ PowerShell 7 并行功能测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 环境配置完成 ===" -ForegroundColor Cyan
Write-Host "重新启动 Cursor/VSCode 以使所有配置生效" -ForegroundColor Yellow
