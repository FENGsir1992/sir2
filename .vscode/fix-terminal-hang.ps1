# Cursor Terminal Hang Fix Script
# This script fixes common Cursor terminal hanging issues

param(
    [switch]$Quick = $false,
    [switch]$Deep = $false,
    [switch]$Reset = $false
)

$ErrorActionPreference = 'Continue'
$pwshPath = "C:/Users/Administrator/pwsh74/pwsh.exe"

Write-Host "=== Cursor Terminal Hang Fix Tool ===" -ForegroundColor Cyan

if ($Reset) {
    Write-Host "`nExecuting deep reset..." -ForegroundColor Yellow
    
    # 1. Clear Cursor cache
    $cursorCachePaths = @(
        "$env:APPDATA\Cursor\User\workspaceStorage",
        "$env:APPDATA\Cursor\logs",
        "$env:APPDATA\Cursor\CachedExtensions"
    )
    
    foreach ($path in $cursorCachePaths) {
        if (Test-Path $path) {
            Write-Host "Clearing cache: $path" -ForegroundColor Gray
            try {
                Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "Warning: Cannot fully clear $path" -ForegroundColor Yellow
            }
        }
    }
    
    # 2. Reset terminal configuration
    Write-Host "Resetting terminal configuration..." -ForegroundColor Gray
    $settingsFile = ".vscode/settings.json"
    if (Test-Path $settingsFile) {
        $backup = "$settingsFile.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $settingsFile $backup
        Write-Host "Configuration backed up to: $backup" -ForegroundColor Green
    }
}

Write-Host "`nDiagnosing terminal issues..." -ForegroundColor Yellow

# Check PowerShell 7 status
Write-Host "`n1. Checking PowerShell 7 status" -ForegroundColor White
if (Test-Path $pwshPath) {
    try {
        $version = & $pwshPath -NoLogo -NoProfile -NonInteractive -Command '$PSVersionTable.PSVersion.ToString()' 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK PowerShell 7 working: $version" -ForegroundColor Green
        } else {
            Write-Host "ERROR PowerShell 7 execution failed: $version" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERROR PowerShell 7 startup failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR PowerShell 7 not found: $pwshPath" -ForegroundColor Red
    Write-Host "Please run: .\install-portable-pwsh.ps1" -ForegroundColor Yellow
}

# Check process conflicts
Write-Host "`n2. Checking process conflicts" -ForegroundColor White
$conflictProcesses = @('pwsh', 'powershell', 'conhost', 'WindowsTerminal')
foreach ($proc in $conflictProcesses) {
    $processes = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($processes) {
        $count = $processes.Count
        Write-Host "WARNING Found $count $proc processes" -ForegroundColor Yellow
        if ($Deep) {
            $processes | ForEach-Object {
                $cpu = if ($_.CPU) { [math]::Round($_.CPU, 2) } else { "N/A" }
                $memory = [math]::Round($_.WorkingSet64/1MB)
                Write-Host "   PID: $($_.Id) CPU: $cpu Memory: ${memory}MB" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "OK No $proc process conflicts" -ForegroundColor Green
    }
}

# Check environment variables
Write-Host "`n3. Checking environment variables" -ForegroundColor White
$envVars = @{
    'SHELL' = $pwshPath
    'PSExecutionPolicyPreference' = 'Bypass'
    'COMSPEC' = $pwshPath
}

foreach ($var in $envVars.Keys) {
    $current = [Environment]::GetEnvironmentVariable($var)
    $expected = $envVars[$var]
    if ($current -eq $expected) {
        Write-Host "OK $var = $current" -ForegroundColor Green
    } else {
        Write-Host "WARNING $var = $current (expected: $expected)" -ForegroundColor Yellow
        # Auto fix
        [Environment]::SetEnvironmentVariable($var, $expected)
        Write-Host "   Fixed environment variable" -ForegroundColor Gray
    }
}

# Check configuration files
Write-Host "`n4. Checking configuration files" -ForegroundColor White
$configFiles = @(
    @{Path = ".vscode/settings.json"; Critical = $true},
    @{Path = ".vscode/tasks.json"; Critical = $false},
    @{Path = ".vscode/launch.json"; Critical = $false}
)

foreach ($config in $configFiles) {
    if (Test-Path $config.Path) {
        try {
            $content = Get-Content $config.Path -Raw | ConvertFrom-Json -ErrorAction Stop
            Write-Host "OK $($config.Path) syntax correct" -ForegroundColor Green
        } catch {
            Write-Host "ERROR $($config.Path) syntax error: $($_.Exception.Message)" -ForegroundColor Red
            if ($config.Critical) {
                Write-Host "   This is a critical configuration file, needs fixing!" -ForegroundColor Red
            }
        }
    } else {
        $status = if ($config.Critical) { "ERROR" } else { "WARNING" }
        $color = if ($config.Critical) { "Red" } else { "Yellow" }
        Write-Host "$status $($config.Path) does not exist" -ForegroundColor $color
    }
}

# Performance tests
if (-not $Quick) {
    Write-Host "`n5. Performance tests" -ForegroundColor White
    
    # Test startup time
    Write-Host "Testing PowerShell startup time..." -ForegroundColor Gray
    $startTime = Get-Date
    try {
        & $pwshPath -NoLogo -NoProfile -NonInteractive -Command "Write-Host 'Test'" | Out-Null
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        if ($duration -lt 1000) {
            Write-Host "OK Startup time: $([math]::Round($duration))ms (good)" -ForegroundColor Green
        } elseif ($duration -lt 3000) {
            Write-Host "WARNING Startup time: $([math]::Round($duration))ms (slow)" -ForegroundColor Yellow
        } else {
            Write-Host "ERROR Startup time: $([math]::Round($duration))ms (too slow)" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERROR Startup time test failed" -ForegroundColor Red
    }
    
    # Test parallel functionality
    Write-Host "Testing parallel functionality..." -ForegroundColor Gray
    try {
        $result = & $pwshPath -NoLogo -NoProfile -NonInteractive -Command "1..3 | ForEach-Object -Parallel { 'Test $_' } -ThrottleLimit 2"
        if ($result.Count -eq 3) {
            Write-Host "OK Parallel functionality working" -ForegroundColor Green
        } else {
            Write-Host "WARNING Parallel functionality abnormal" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "ERROR Parallel functionality test failed" -ForegroundColor Red
    }
}

Write-Host "`nFix suggestions" -ForegroundColor Cyan

# Generate fix suggestions
$suggestions = @()

# Check if Cursor needs restart
$cursorProcesses = Get-Process -Name "Cursor*" -ErrorAction SilentlyContinue
if ($cursorProcesses) {
    $suggestions += "Restart Cursor editor"
}

# Check if processes need cleanup
$totalProcesses = (Get-Process -Name @('pwsh', 'powershell', 'conhost') -ErrorAction SilentlyContinue).Count
if ($totalProcesses -gt 5) {
    $suggestions += "Clean up excess PowerShell processes"
}

# Check if reconfiguration needed
if (-not (Test-Path ".vscode/settings.json")) {
    $suggestions += "Re-run configuration script: .\setup-cursor-powershell.ps1"
}

if ($suggestions.Count -gt 0) {
    Write-Host "`nRecommended actions:" -ForegroundColor White
    for ($i = 0; $i -lt $suggestions.Count; $i++) {
        Write-Host "$($i + 1). $($suggestions[$i])" -ForegroundColor Gray
    }
} else {
    Write-Host "OK No obvious issues found" -ForegroundColor Green
}

Write-Host "`nQuick fix commands" -ForegroundColor Cyan
Write-Host "If problems persist, try:" -ForegroundColor White
Write-Host "1. Reset fix: .\.vscode\fix-terminal-hang.ps1 -Reset" -ForegroundColor Gray
Write-Host "2. Deep diagnosis: .\.vscode\fix-terminal-hang.ps1 -Deep" -ForegroundColor Gray
Write-Host "3. Reconfigure: .\setup-cursor-powershell.ps1 -Force" -ForegroundColor Gray
Write-Host "4. Complete reset: Delete .vscode folder and reconfigure" -ForegroundColor Gray

Write-Host "`n=== Diagnosis Complete ===" -ForegroundColor Cyan