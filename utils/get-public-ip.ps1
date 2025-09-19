# =========================================
# WZ工作流迁移系统 - 公网IP获取工具
# PowerShell版本 - 更可靠的IP获取
# =========================================

param(
    [switch]$Verbose,
    [switch]$Json
)

function Write-Log {
    param($Message, $Level = "INFO")
    if ($Verbose) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(
            switch ($Level) {
                "ERROR" { "Red" }
                "WARN" { "Yellow" }
                "SUCCESS" { "Green" }
                default { "White" }
            }
        )
    }
}

function Get-PublicIP {
    $services = @(
        @{ Name = "ipinfo.io"; Url = "https://ipinfo.io/ip"; Method = "Direct" },
        @{ Name = "ipify.org"; Url = "https://api.ipify.org"; Method = "Direct" },
        @{ Name = "httpbin.org"; Url = "https://httpbin.org/ip"; Method = "Json" },
        @{ Name = "icanhazip.com"; Url = "https://icanhazip.com"; Method = "Direct" },
        @{ Name = "whatismyipaddress.com"; Url = "https://bot.whatismyipaddress.com"; Method = "Direct" }
    )

    foreach ($service in $services) {
        try {
            Write-Log "尝试从 $($service.Name) 获取公网IP..." "INFO"
            
            $response = Invoke-RestMethod -Uri $service.Url -TimeoutSec 10 -ErrorAction Stop
            
            $ip = if ($service.Method -eq "Json") {
                $response.origin
            } else {
                $response.ToString().Trim()
            }

            # 验证IP地址格式
            if ($ip -match "^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$") {
                # 进一步验证每个八位组都在0-255范围内
                $octets = $ip.Split('.')
                $validIP = $true
                foreach ($octet in $octets) {
                    if ([int]$octet -gt 255) {
                        $validIP = $false
                        break
                    }
                }
                
                if ($validIP) {
                    Write-Log "成功从 $($service.Name) 获取到IP: $ip" "SUCCESS"
                    return $ip
                }
            }
            
            Write-Log "从 $($service.Name) 获取到无效IP格式: $ip" "WARN"
        }
        catch {
            Write-Log "从 $($service.Name) 获取IP失败: $($_.Exception.Message)" "ERROR"
        }
    }

    Write-Log "所有服务都无法获取公网IP" "ERROR"
    return $null
}

function Test-LocalIP {
    $targetIP = "192.168.0.100"
    $networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -eq $targetIP }
    
    if ($networkAdapters) {
        Write-Log "本地IP验证通过: $targetIP" "SUCCESS"
        return $true
    } else {
        Write-Log "本地IP不是 $targetIP" "ERROR"
        $currentIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" } | Select-Object IPAddress
        Write-Log "当前检测到的IP地址:" "INFO"
        foreach ($ip in $currentIPs) {
            Write-Log "  - $($ip.IPAddress)" "INFO"
        }
        return $false
    }
}

function Test-NetworkConnectivity {
    try {
        $result = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet
        if ($result) {
            Write-Log "网络连接正常" "SUCCESS"
            return $true
        } else {
            Write-Log "网络连接异常" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "网络连接测试失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 主执行逻辑
try {
    $result = @{}

    # 测试网络连接
    if (-not (Test-NetworkConnectivity)) {
        $result.success = $false
        $result.error = "网络连接异常，请检查VPN连接"
        if ($Json) {
            $result | ConvertTo-Json
        } else {
            Write-Host $result.error -ForegroundColor Red
        }
        exit 1
    }

    # 验证本地IP
    if (-not (Test-LocalIP)) {
        $result.success = $false
        $result.error = "本地IP地址不是192.168.0.100"
        if ($Json) {
            $result | ConvertTo-Json
        } else {
            Write-Host $result.error -ForegroundColor Red
        }
        exit 1
    }

    # 获取公网IP
    $publicIP = Get-PublicIP
    if (-not $publicIP) {
        $result.success = $false
        $result.error = "无法获取公网IP地址"
        if ($Json) {
            $result | ConvertTo-Json
        } else {
            Write-Host $result.error -ForegroundColor Red
        }
        exit 1
    }

    # 成功结果
    $result.success = $true
    $result.publicIP = $publicIP
    $result.localIP = "192.168.0.100"
    $result.timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    if ($Json) {
        $result | ConvertTo-Json
    } else {
        Write-Host "公网IP: $publicIP" -ForegroundColor Green
    }
}
catch {
    $result = @{
        success = $false
        error = "脚本执行出错: $($_.Exception.Message)"
    }
    
    if ($Json) {
        $result | ConvertTo-Json
    } else {
        Write-Host $result.error -ForegroundColor Red
    }
    exit 1
}
