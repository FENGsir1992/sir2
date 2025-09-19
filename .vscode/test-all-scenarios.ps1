# 全场景 PowerShell 7 测试脚本
# 此脚本测试 Cursor 中所有可能的 PowerShell 7 使用场景

param(
    [switch]$Quick = $false,
    [switch]$Detailed = $false
)

$ErrorActionPreference = 'Continue'
$pwshPath = "C:/Users/Administrator/pwsh74/pwsh.exe"

Write-Host "=== 全场景 PowerShell 7 测试 ===" -ForegroundColor Cyan

# 测试计数器
$testCount = 0
$passCount = 0

function Test-Scenario {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    $script:testCount++
    Write-Host "`n[$script:testCount] 测试: $Name" -ForegroundColor Yellow
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host "    ✅ 通过" -ForegroundColor Green
            $script:passCount++
            return $true
        } else {
            Write-Host "    ❌ 失败" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "    ❌ 异常: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. 基础 PowerShell 7 功能测试
Test-Scenario "PowerShell 7 基础功能" {
    if (Test-Path $pwshPath) {
        $version = & $pwshPath -NoLogo -NoProfile -NonInteractive -Command '$PSVersionTable.PSVersion.Major'
        return [int]$version -ge 7
    }
    return $false
}

# 2. 并行处理测试（PowerShell 7 特性）
Test-Scenario "PowerShell 7 并行处理" {
    try {
        $result = 1..3 | ForEach-Object -Parallel { $_ * 2 } -ThrottleLimit 2
        return $result.Count -eq 3
    } catch {
        return $false
    }
}

# 3. 配置文件存在性测试
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
    Test-Scenario "配置文件: $file" {
        return Test-Path $file
    }
}

# 4. 配置内容验证
Test-Scenario "settings.json PowerShell 7 配置" {
    if (Test-Path ".vscode/settings.json") {
        $content = Get-Content ".vscode/settings.json" -Raw
        return $content -match 'pwsh74' -and $content -match 'PowerShell 7'
    }
    return $false
}

Test-Scenario "tasks.json PowerShell 7 配置" {
    if (Test-Path ".vscode/tasks.json") {
        $content = Get-Content ".vscode/tasks.json" -Raw
        return $content -match 'pwsh74'
    }
    return $false
}

Test-Scenario "launch.json PowerShell 7 配置" {
    if (Test-Path ".vscode/launch.json") {
        $content = Get-Content ".vscode/launch.json" -Raw
        return $content -match 'pwsh74' -or $content -match 'PowerShell'
    }
    return $false
}

# 5. npm 配置测试
Test-Scenario "npm script-shell 配置" {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        try {
            $npmShell = npm config get script-shell 2>$null
            return $npmShell -match 'pwsh'
        } catch {
            return $false
        }
    }
    return $true # 如果 npm 不存在，跳过测试
}

# 6. 环境变量测试
Test-Scenario "SHELL 环境变量" {
    return $env:SHELL -eq $pwshPath
}

Test-Scenario "PSExecutionPolicyPreference 环境变量" {
    return $env:PSExecutionPolicyPreference -eq "Bypass"
}

# 7. 命令执行测试
if (-not $Quick) {
    $testCommands = @(
        @{Name = "Get-Location"; Command = "Get-Location"},
        @{Name = "Get-Date"; Command = "Get-Date"},
        @{Name = "PowerShell Version"; Command = '$PSVersionTable.PSVersion'}
    )
    
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $testCommands += @{Name = "Node.js Version"; Command = "node --version"}
    }
    
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        $testCommands += @{Name = "npm Version"; Command = "npm --version"}
    }
    
    foreach ($cmd in $testCommands) {
        Test-Scenario "命令执行: $($cmd.Name)" {
            try {
                $result = Invoke-Expression $cmd.Command 2>$null
                return $null -ne $result
            } catch {
                return $false
            }
        }
    }
}

# 8. JSON 语法验证测试
$jsonFiles = @(".vscode/settings.json", ".vscode/tasks.json", ".vscode/launch.json", "WZZ.code-workspace")
foreach ($jsonFile in $jsonFiles) {
    Test-Scenario "JSON 语法: $jsonFile" {
        if (Test-Path $jsonFile) {
            try {
                $content = Get-Content $jsonFile -Raw | ConvertFrom-Json
                return $true
            } catch {
                return $false
            }
        }
        return $false
    }
}

# 详细测试模式
if ($Detailed) {
    Write-Host "`n🔍 详细配置分析..." -ForegroundColor Yellow
    
    # 分析 settings.json
    if (Test-Path ".vscode/settings.json") {
        $settings = Get-Content ".vscode/settings.json" -Raw | ConvertFrom-Json
        $pwshConfigs = $settings.PSObject.Properties | Where-Object { 
            $_.Name -match 'terminal|powershell|shell' -and $_.Value -match 'pwsh'
        }
        Write-Host "📋 PowerShell 相关配置项: $($pwshConfigs.Count)" -ForegroundColor Gray
        if ($Detailed) {
            $pwshConfigs | ForEach-Object { 
                Write-Host "    $($_.Name): $($_.Value)" -ForegroundColor Gray 
            }
        }
    }
    
    # 分析任务数量
    if (Test-Path ".vscode/tasks.json") {
        $tasks = (Get-Content ".vscode/tasks.json" -Raw | ConvertFrom-Json).tasks
        $pwshTasks = $tasks | Where-Object { 
            $_.options.shell.executable -match 'pwsh'
        }
        Write-Host "📋 PowerShell 任务数量: $($pwshTasks.Count)/$($tasks.Count)" -ForegroundColor Gray
    }
}

# 测试总结
Write-Host "`n=== 测试总结 ===" -ForegroundColor Cyan
Write-Host "总测试数: $testCount" -ForegroundColor White
Write-Host "通过数: $passCount" -ForegroundColor Green
Write-Host "失败数: $($testCount - $passCount)" -ForegroundColor Red

$successRate = [math]::Round(($passCount / $testCount) * 100, 1)
Write-Host "成功率: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

if ($successRate -eq 100) {
    Write-Host "`n🎉 完美！所有测试都通过了！" -ForegroundColor Green
    Write-Host "Cursor 已完全配置为强制使用 PowerShell 7" -ForegroundColor Green
} elseif ($successRate -ge 90) {
    Write-Host "`n✅ 很好！大部分配置正确" -ForegroundColor Yellow
    Write-Host "可能需要微调某些设置" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  需要检查配置！" -ForegroundColor Red
    Write-Host "请运行 setup-cursor-powershell.ps1 重新配置" -ForegroundColor Red
}

Write-Host "`n使用参数:" -ForegroundColor Gray
Write-Host "  -Quick    快速测试（跳过命令执行测试）" -ForegroundColor Gray
Write-Host "  -Detailed 显示详细的配置分析" -ForegroundColor Gray
