# WZ工作流迁移系统 - 停止服务脚本
Write-Host "================================" -ForegroundColor Red
Write-Host "    停止VPN服务" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Red
Write-Host ""

# 读取进程信息
if (Test-Path ".vpn-processes.json") {
    try {
        $processInfo = Get-Content ".vpn-processes.json" | ConvertFrom-Json
        
        Write-Host "发现运行中的服务:" -ForegroundColor Yellow
        Write-Host "  启动时间: $($processInfo.startTime)" -ForegroundColor White
        Write-Host "  公网IP: $($processInfo.publicIP)" -ForegroundColor White
        Write-Host "  后端PID: $($processInfo.backendPID)" -ForegroundColor White
        Write-Host "  前端PID: $($processInfo.frontendPID)" -ForegroundColor White
        Write-Host ""
        
        # 停止后端服务
        try {
            $backendProcess = Get-Process -Id $processInfo.backendPID -ErrorAction SilentlyContinue
            if ($backendProcess) {
                Stop-Process -Id $processInfo.backendPID -Force
                Write-Host "[OK] 后端服务已停止 (PID: $($processInfo.backendPID))" -ForegroundColor Green
            } else {
                Write-Host "[INFO] 后端服务进程不存在" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[ERROR] 停止后端服务失败: $_" -ForegroundColor Red
        }
        
        # 停止前端服务
        try {
            $frontendProcess = Get-Process -Id $processInfo.frontendPID -ErrorAction SilentlyContinue
            if ($frontendProcess) {
                Stop-Process -Id $processInfo.frontendPID -Force
                Write-Host "[OK] 前端服务已停止 (PID: $($processInfo.frontendPID))" -ForegroundColor Green
            } else {
                Write-Host "[INFO] 前端服务进程不存在" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[ERROR] 停止前端服务失败: $_" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "[ERROR] 读取进程信息失败: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[INFO] 未找到进程信息文件，尝试通过端口查找进程..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "通过端口查找并停止相关进程..." -ForegroundColor Yellow

# 通过端口查找并停止进程
$processes3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($processes3001) {
    $processes3001 | ForEach-Object {
        $processId = $_.OwningProcess
        try {
            $processName = (Get-Process -Id $processId).ProcessName
            Stop-Process -Id $processId -Force
            Write-Host "[OK] 停止占用端口3001的进程: $processName (PID: $processId)" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] 无法停止进程 $processId" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[INFO] 端口3001未被占用" -ForegroundColor Yellow
}

$processes5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($processes5173) {
    $processes5173 | ForEach-Object {
        $processId = $_.OwningProcess
        try {
            $processName = (Get-Process -Id $processId).ProcessName
            Stop-Process -Id $processId -Force
            Write-Host "[OK] 停止占用端口5173的进程: $processName (PID: $processId)" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] 无法停止进程 $processId" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[INFO] 端口5173未被占用" -ForegroundColor Yellow
}

# 查找并停止所有相关的npm/node进程
Write-Host ""
Write-Host "查找并停止相关的Node.js进程..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*npm run dev*" -or 
    $_.CommandLine -like "*vite*" -or
    $_.CommandLine -like "*3001*" -or
    $_.CommandLine -like "*5173*"
}

if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force
            Write-Host "[OK] 停止Node.js进程: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] 无法停止Node.js进程 $($_.Id)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[INFO] 未找到相关的Node.js进程" -ForegroundColor Yellow
}

# 清理进程信息文件
if (Test-Path ".vpn-processes.json") {
    Remove-Item ".vpn-processes.json" -Force
    Write-Host "[OK] 清理进程信息文件" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "服务停止完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

Read-Host "按回车键关闭此窗口"


