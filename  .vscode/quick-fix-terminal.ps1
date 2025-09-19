# Quick Fix Terminal Hang Script
# 无交互一键修复：终端卡死/转圈

$ErrorActionPreference = 'Continue'
$pwshPath = "C:/Users/Administrator/pwsh74/pwsh.exe"

Write-Host "=== Quick Fix: Terminal Hang ===" -ForegroundColor Cyan

# 1) 快速诊断（非详细）
try {
	& .\.vscode\fix-terminal-hang.ps1 -Quick | Out-Host
} catch {
	Write-Host "诊断脚本不可用，跳过快速诊断" -ForegroundColor Yellow
}

# 2) 清理多余进程（无交互）
try {
	& .\.vscode\cleanup-processes.ps1 -Force | Out-Host
} catch {
	Write-Host "清理脚本不可用，尝试内置简易清理" -ForegroundColor Yellow
	try {
		Get-Process -Name "pwsh","powershell" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
	} catch {}
}

# 3) 轻量重置 Cursor 缓存（不中断当前会话）
$paths = @(
	"$env:APPDATA/Cursor/User/workspaceStorage",
	"$env:APPDATA/Cursor/logs"
)
foreach ($p in $paths) {
	if (Test-Path $p) {
		try { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue } catch {}
	}
}

# 4) 校验 PowerShell 7 可用性 + 启动耗时
try {
	$start = Get-Date
	& $pwshPath -NoLogo -NoProfile -NonInteractive -Command "Write-Host 'OK'" | Out-Null
	$ms = ((Get-Date) - $start).TotalMilliseconds
	Write-Host ("PowerShell7 OK, startup {0} ms" -f [math]::Round($ms)) -ForegroundColor Green
} catch {
	Write-Host "PowerShell7 异常，请先运行 install-portable-pwsh.ps1" -ForegroundColor Red
}

# 5) 输出下一步行动建议
Write-Host "`n建议: 关闭并重启 Cursor，然后重开终端(Ctrl+`)" -ForegroundColor Yellow
Write-Host "如果仍卡: 运行 .\\.vscode\\fix-terminal-hang.ps1 -Deep 或 .\\.vscode\\reset-terminal.ps1" -ForegroundColor Yellow

Write-Host "`n=== Quick Fix Done ===" -ForegroundColor Cyan
