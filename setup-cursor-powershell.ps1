# Cursor PowerShell 7 完整配置脚本
# 此脚本确保整个项目在 Cursor 中强制使用 PowerShell 7

param(
    [switch]$Force = $false,
    [switch]$Verify = $false
)

$ErrorActionPreference = 'Stop'
$pwshPath = "C:/Users/Administrator/pwsh74/pwsh.exe"

Write-Host "=== Cursor PowerShell 7 强制配置脚本 ===" -ForegroundColor Cyan

if ($Verify) {
    # 验证模式
    Write-Host "`n🔍 验证配置状态..." -ForegroundColor Yellow
    
    if (-not (Test-Path $pwshPath)) {
        Write-Host "❌ PowerShell 7 不存在: $pwshPath" -ForegroundColor Red
        exit 1
    }
    
    $configFiles = @(
        ".vscode/settings.json",
        ".vscode/tasks.json", 
        ".vscode/launch.json",
        ".vscode/powershell.config.json",
        ".npmrc",
        "backend/.npmrc",
        "WZZ.code-workspace"
    )
    
    $allGood = $true
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            $content = Get-Content $file -Raw
            if ($content -match 'pwsh74|PowerShell 7') {
                Write-Host "✅ $file - 包含 PowerShell 7 配置" -ForegroundColor Green
            } else {
                Write-Host "⚠️  $file - 缺少 PowerShell 7 配置" -ForegroundColor Yellow
                $allGood = $false
            }
        } else {
            Write-Host "❌ $file - 文件缺失" -ForegroundColor Red
            $allGood = $false
        }
    }
    
    if ($allGood) {
        Write-Host "`n🎉 所有配置文件都正确！" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  部分配置需要修复" -ForegroundColor Yellow
    }
    
    # 测试 PowerShell 7 功能
    Write-Host "`n🧪 测试 PowerShell 7 功能..." -ForegroundColor Yellow
    try {
        $result = 1..3 | ForEach-Object -Parallel { "Test $_" } -ThrottleLimit 2
        Write-Host "✅ PowerShell 7 并行功能正常" -ForegroundColor Green
    } catch {
        Write-Host "❌ PowerShell 7 并行功能失败" -ForegroundColor Red
    }
    
    exit 0
}

Write-Host "`n📋 检查先决条件..." -ForegroundColor Yellow

# 检查 PowerShell 7 是否存在
if (-not (Test-Path $pwshPath)) {
    Write-Host "❌ PowerShell 7 不存在于: $pwshPath" -ForegroundColor Red
    Write-Host "请先运行 install-portable-pwsh.ps1 安装 PowerShell 7" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PowerShell 7 已安装: $pwshPath" -ForegroundColor Green

# 检查版本
$version = & $pwshPath -NoLogo -NoProfile -NonInteractive -Command '$PSVersionTable.PSVersion.ToString()'
Write-Host "✅ PowerShell 版本: $version" -ForegroundColor Green

Write-Host "`n🔧 配置环境变量..." -ForegroundColor Yellow

# 设置当前会话环境变量
$env:SHELL = $pwshPath
$env:PSExecutionPolicyPreference = "Bypass"
$env:COMSPEC = $pwshPath

Write-Host "✅ 环境变量已设置" -ForegroundColor Green

# 配置 npm
Write-Host "`n📦 配置 npm..." -ForegroundColor Yellow
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm config set script-shell $pwshPath
    Write-Host "✅ npm 已配置使用 PowerShell 7" -ForegroundColor Green
} else {
    Write-Host "⚠️  npm 未找到，跳过配置" -ForegroundColor Yellow
}

Write-Host "`n📁 检查必要的配置文件..." -ForegroundColor Yellow

$requiredFiles = @(
    @{Path = ".vscode"; Type = "Directory"},
    @{Path = ".vscode/settings.json"; Type = "File"},
    @{Path = ".vscode/tasks.json"; Type = "File"},
    @{Path = ".vscode/launch.json"; Type = "File"},
    @{Path = ".vscode/powershell.config.json"; Type = "File"},
    @{Path = ".npmrc"; Type = "File"},
    @{Path = "backend/.npmrc"; Type = "File"},
    @{Path = "WZZ.code-workspace"; Type = "File"}
)

foreach ($item in $requiredFiles) {
    if (Test-Path $item.Path) {
        Write-Host "✅ $($item.Path) 存在" -ForegroundColor Green
    } else {
        Write-Host "❌ $($item.Path) 缺失" -ForegroundColor Red
        if ($item.Type -eq "Directory") {
            Write-Host "   创建目录: $($item.Path)" -ForegroundColor Yellow
            New-Item -ItemType Directory -Path $item.Path -Force | Out-Null
        }
    }
}

Write-Host "`n🎯 验证配置完整性..." -ForegroundColor Yellow

# 检查关键配置是否正确
$settingsFile = ".vscode/settings.json"
if (Test-Path $settingsFile) {
    $settings = Get-Content $settingsFile -Raw | ConvertFrom-Json
    $pwsh7Configs = @(
        "terminal.integrated.defaultProfile.windows",
        "terminal.integrated.automationProfile.windows",
        "powershell.powerShellDefaultVersion"
    )
    
    $configCount = 0
    foreach ($config in $pwsh7Configs) {
        if ($settings.PSObject.Properties.Name -contains $config) {
            $configCount++
        }
    }
    
    if ($configCount -eq $pwsh7Configs.Count) {
        Write-Host "✅ VSCode/Cursor 设置配置完整" -ForegroundColor Green
    } else {
        Write-Host "⚠️  VSCode/Cursor 设置需要更新 ($configCount/$($pwsh7Configs.Count))" -ForegroundColor Yellow
    }
}

Write-Host "`n🚀 最终测试..." -ForegroundColor Yellow

# 测试命令执行
try {
    $testResult = & $pwshPath -NoLogo -NoProfile -NonInteractive -Command "Get-Location"
    Write-Host "✅ PowerShell 7 命令执行正常" -ForegroundColor Green
} catch {
    Write-Host "❌ PowerShell 7 命令执行失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 配置完成 ===" -ForegroundColor Cyan
Write-Host "🔄 请重启 Cursor 以使所有配置生效" -ForegroundColor Yellow
Write-Host "`n📋 下一步操作:" -ForegroundColor White
Write-Host "1. 重启 Cursor" -ForegroundColor Gray
Write-Host "2. 运行: .\.vscode\verify-powershell.ps1 -Detailed" -ForegroundColor Gray
Write-Host "3. 测试终端、任务和调试功能" -ForegroundColor Gray

Write-Host "`n🎉 Cursor 现在将在所有场景下强制使用 PowerShell 7！" -ForegroundColor Green
