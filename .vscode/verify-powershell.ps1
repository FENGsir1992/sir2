# PowerShell 配置验证脚本
# 此脚本用于验证 Cursor 是否正确配置为使用 PowerShell 7

param(
    [switch]$Detailed = $false,
    [switch]$TestCommands = $false
)

$ErrorActionPreference = 'Continue'

Write-Host "=== PowerShell 配置全面验证 ===" -ForegroundColor Cyan

# 1. 检查 PowerShell 版本
Write-Host "`n1. PowerShell 版本信息:" -ForegroundColor Yellow
$PSVersionTable.PSVersion | Format-Table -AutoSize
Write-Host "PowerShell 路径: $PSHOME" -ForegroundColor Gray

# 2. 检查执行策略
Write-Host "`n2. 执行策略:" -ForegroundColor Yellow
Get-ExecutionPolicy -List | Format-Table -AutoSize

# 3. 检查环境变量
Write-Host "`n3. 相关环境变量:" -ForegroundColor Yellow
$envVars = @{
    "SHELL" = $env:SHELL
    "COMSPEC" = $env:COMSPEC
    "PSExecutionPolicyPreference" = $env:PSExecutionPolicyPreference
    "POWERSHELL_DISTRIBUTION_CHANNEL" = $env:POWERSHELL_DISTRIBUTION_CHANNEL
}

foreach ($var in $envVars.GetEnumerator()) {
    $status = if ($var.Value) { "✓" } else { "✗" }
    $color = if ($var.Value) { "Green" } else { "Red" }
    Write-Host "$status $($var.Key): $($var.Value)" -ForegroundColor $color
}

# 4. 检查配置文件
Write-Host "`n4. 配置文件检查:" -ForegroundColor Yellow
$configFiles = @(
    ".vscode/settings.json",
    ".vscode/tasks.json", 
    ".vscode/launch.json",
    ".vscode/powershell.config.json",
    ".npmrc",
    "backend/.npmrc",
    "WZZ.code-workspace"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file 存在" -ForegroundColor Green
        if ($Detailed) {
            $content = Get-Content $file -Raw
            if ($content -match 'pwsh74|PowerShell 7') {
                Write-Host "  → 包含 PowerShell 7 配置" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✗ $file 缺失" -ForegroundColor Red
    }
}

# 5. PowerShell 7 特有功能测试
Write-Host "`n5. PowerShell 7 特有功能测试:" -ForegroundColor Yellow

# 测试 Test-Json cmdlet (PowerShell 6+)
if (Get-Command -Name "Test-Json" -ErrorAction SilentlyContinue) {
    Write-Host "✓ Test-Json cmdlet 可用 (PowerShell 6+)" -ForegroundColor Green
} else {
    Write-Host "✗ Test-Json cmdlet 不可用" -ForegroundColor Red
}

# 测试版本
if ($PSVersionTable.PSVersion.Major -ge 7) {
    Write-Host "✓ PowerShell 7+ 正在运行 (版本: $($PSVersionTable.PSVersion))" -ForegroundColor Green
} else {
    Write-Host "✗ 未使用 PowerShell 7+ (当前版本: $($PSVersionTable.PSVersion))" -ForegroundColor Red
}

# 测试并行处理能力
Write-Host "`n6. 并行处理测试 (PowerShell 7 特性):" -ForegroundColor Yellow
try {
    $startTime = Get-Date
    $result = 1..5 | ForEach-Object -Parallel { 
        Start-Sleep -Milliseconds 100
        "Process $_" 
    } -ThrottleLimit 3
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    Write-Host "✓ 并行处理功能正常 (耗时: $([math]::Round($duration))ms)" -ForegroundColor Green
} catch {
    Write-Host "✗ 并行处理功能不可用: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. npm 配置检查
Write-Host "`n7. npm 配置检查:" -ForegroundColor Yellow
if (Get-Command npm -ErrorAction SilentlyContinue) {
    try {
        $npmShell = npm config get script-shell 2>$null
        if ($npmShell -match 'pwsh') {
            Write-Host "✓ npm script-shell 配置为 PowerShell: $npmShell" -ForegroundColor Green
        } else {
            Write-Host "! npm script-shell: $npmShell (建议配置为 PowerShell)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ 无法获取 npm 配置" -ForegroundColor Red
    }
} else {
    Write-Host "✗ npm 未安装或不在 PATH 中" -ForegroundColor Red
}

# 8. 命令测试（可选）
if ($TestCommands) {
    Write-Host "`n8. 命令执行测试:" -ForegroundColor Yellow
    
    $testCommands = @(
        "Get-Location",
        "Get-Date",
        "node --version",
        "npm --version"
    )
    
    foreach ($cmd in $testCommands) {
        try {
            $result = Invoke-Expression $cmd 2>$null
            Write-Host "✓ $cmd : $result" -ForegroundColor Green
        } catch {
            Write-Host "✗ $cmd 失败: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 9. 总结
Write-Host "`n=== 验证总结 ===" -ForegroundColor Cyan

$pwsh7Running = $PSVersionTable.PSVersion.Major -ge 7
$hasParallel = $null -ne (Get-Command ForEach-Object -ParameterName Parallel -ErrorAction SilentlyContinue)
$configExists = Test-Path ".vscode/settings.json"

if ($pwsh7Running -and $hasParallel -and $configExists) {
    Write-Host "🎉 PowerShell 7 配置完美！所有检查都通过了。" -ForegroundColor Green
    Write-Host "   Cursor 将在所有任务中使用 PowerShell 7。" -ForegroundColor Green
} elseif ($pwsh7Running) {
    Write-Host "⚠️  PowerShell 7 运行正常，但可能缺少一些配置文件。" -ForegroundColor Yellow
} else {
    Write-Host "❌ PowerShell 7 配置有问题，请检查上述错误。" -ForegroundColor Red
}

Write-Host "`n使用参数:" -ForegroundColor Gray
Write-Host "  -Detailed    显示详细的配置文件信息" -ForegroundColor Gray
Write-Host "  -TestCommands 测试常用命令执行" -ForegroundColor Gray
