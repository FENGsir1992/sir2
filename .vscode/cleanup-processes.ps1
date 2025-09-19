# PowerShell Process Cleanup Script
# This script safely cleans up excess PowerShell processes

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

Write-Host "=== PowerShell Process Cleanup ===" -ForegroundColor Cyan

# Get current process ID to avoid killing ourselves
$currentPID = $PID
Write-Host "Current PowerShell PID: $currentPID" -ForegroundColor Green

# Find all PowerShell processes
$pwshProcesses = Get-Process -Name "pwsh" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPID }
$powershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue
$conhostProcesses = Get-Process -Name "conhost" -ErrorAction SilentlyContinue

Write-Host "`nFound processes:" -ForegroundColor Yellow
Write-Host "- pwsh processes (excluding current): $($pwshProcesses.Count)" -ForegroundColor White
Write-Host "- powershell processes: $($powershellProcesses.Count)" -ForegroundColor White  
Write-Host "- conhost processes: $($conhostProcesses.Count)" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n[DRY RUN] Would terminate the following processes:" -ForegroundColor Yellow
    
    if ($pwshProcesses) {
        Write-Host "`npwsh processes:" -ForegroundColor Cyan
        $pwshProcesses | ForEach-Object {
            $memory = [math]::Round($_.WorkingSet64/1MB)
            Write-Host "  PID: $($_.Id) Memory: ${memory}MB" -ForegroundColor Gray
        }
    }
    
    if ($powershellProcesses) {
        Write-Host "`npowershell processes:" -ForegroundColor Cyan
        $powershellProcesses | ForEach-Object {
            $memory = [math]::Round($_.WorkingSet64/1MB)
            Write-Host "  PID: $($_.Id) Memory: ${memory}MB" -ForegroundColor Gray
        }
    }
    
    if ($conhostProcesses) {
        Write-Host "`nconhost processes:" -ForegroundColor Cyan
        $conhostProcesses | ForEach-Object {
            $memory = [math]::Round($_.WorkingSet64/1MB)
            Write-Host "  PID: $($_.Id) Memory: ${memory}MB" -ForegroundColor Gray
        }
    }
    
    Write-Host "`nTo actually clean up, run: .\.vscode\cleanup-processes.ps1 -Force" -ForegroundColor Yellow
    exit 0
}

if (-not $Force) {
    Write-Host "`nThis will terminate excess PowerShell processes." -ForegroundColor Yellow
    Write-Host "Current PowerShell session (PID: $currentPID) will be preserved." -ForegroundColor Green
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`nCleaning up processes..." -ForegroundColor Yellow

$cleaned = 0

# Clean up pwsh processes (except current)
if ($pwshProcesses) {
    Write-Host "Terminating pwsh processes..." -ForegroundColor Gray
    foreach ($proc in $pwshProcesses) {
        try {
            $proc | Stop-Process -Force -ErrorAction Stop
            Write-Host "  Terminated PID: $($proc.Id)" -ForegroundColor Green
            $cleaned++
        } catch {
            Write-Host "  Failed to terminate PID: $($proc.Id) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Clean up powershell processes
if ($powershellProcesses) {
    Write-Host "Terminating powershell processes..." -ForegroundColor Gray
    foreach ($proc in $powershellProcesses) {
        try {
            $proc | Stop-Process -Force -ErrorAction Stop
            Write-Host "  Terminated PID: $($proc.Id)" -ForegroundColor Green
            $cleaned++
        } catch {
            Write-Host "  Failed to terminate PID: $($proc.Id) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Clean up orphaned conhost processes (be more careful with these)
if ($conhostProcesses) {
    Write-Host "Checking conhost processes..." -ForegroundColor Gray
    foreach ($proc in $conhostProcesses) {
        try {
            # Only terminate conhost if it's using minimal CPU and memory (likely orphaned)
            if ($proc.WorkingSet64 -lt 20MB) {
                $proc | Stop-Process -Force -ErrorAction Stop
                Write-Host "  Terminated orphaned conhost PID: $($proc.Id)" -ForegroundColor Green
                $cleaned++
            } else {
                Write-Host "  Skipped active conhost PID: $($proc.Id)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  Failed to terminate conhost PID: $($proc.Id) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
Write-Host "Terminated $cleaned processes" -ForegroundColor White

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 2

# Verify cleanup
Write-Host "`nVerifying cleanup..." -ForegroundColor Yellow
$remainingPwsh = (Get-Process -Name "pwsh" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPID }).Count
$remainingPowershell = (Get-Process -Name "powershell" -ErrorAction SilentlyContinue).Count
$remainingConhost = (Get-Process -Name "conhost" -ErrorAction SilentlyContinue).Count

Write-Host "Remaining processes:" -ForegroundColor White
Write-Host "- pwsh processes (excluding current): $remainingPwsh" -ForegroundColor $(if ($remainingPwsh -lt 3) { "Green" } else { "Yellow" })
Write-Host "- powershell processes: $remainingPowershell" -ForegroundColor $(if ($remainingPowershell -eq 0) { "Green" } else { "Yellow" })
Write-Host "- conhost processes: $remainingConhost" -ForegroundColor $(if ($remainingConhost -lt 3) { "Green" } else { "Yellow" })

if ($remainingPwsh -lt 3 -and $remainingPowershell -eq 0 -and $remainingConhost -lt 3) {
    Write-Host "`nExcellent! Process count is now optimal." -ForegroundColor Green
    Write-Host "You can now restart Cursor and the terminal should work smoothly." -ForegroundColor Green
} else {
    Write-Host "`nProcess count improved but still high." -ForegroundColor Yellow
    Write-Host "Consider restarting your computer for a complete cleanup." -ForegroundColor Yellow
}

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Cyan
