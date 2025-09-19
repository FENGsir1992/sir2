# PowerShell版本的API测试脚本
# 解决Node.js HTTP客户端的兼容性问题

param(
    [string]$BaseUrl = "http://localhost:3001",
    [int]$MaxRetries = 3,
    [int]$RetryDelay = 2
)

Write-Host "🧪 PowerShell API 测试工具" -ForegroundColor Cyan
Write-Host "基础URL: $BaseUrl" -ForegroundColor Yellow
Write-Host ""

# 测试健康检查端点
function Test-HealthEndpoint {
    param([string]$Url, [int]$Retries, [int]$Delay)
    
    for ($i = 1; $i -le $Retries; $i++) {
        Write-Host "🔍 测试健康检查端点 ($i/$Retries)" -ForegroundColor Cyan
        
        try {
            # 使用Invoke-RestMethod而不是Invoke-WebRequest
            $response = Invoke-RestMethod -Uri "$Url/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
            
            Write-Host "✅ 健康检查成功!" -ForegroundColor Green
            Write-Host "📊 响应数据:" -ForegroundColor Blue
            $response | ConvertTo-Json -Depth 2 | Write-Host -ForegroundColor White
            return $true
            
        } catch [System.Net.WebException] {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "⚠️  HTTP错误 $statusCode" -ForegroundColor Yellow
            
        } catch [System.Net.Sockets.SocketException] {
            Write-Host "❌ Socket连接错误: $($_.Exception.Message)" -ForegroundColor Red
            
        } catch {
            Write-Host "❌ 连接失败: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        if ($i -lt $Retries) {
            Write-Host "⏳ $Delay 秒后重试..." -ForegroundColor Yellow
            Start-Sleep -Seconds $Delay
        }
    }
    
    return $false
}

# 测试登录端点
function Test-LoginEndpoint {
    param([string]$Url)
    
    Write-Host "🔐 测试登录端点" -ForegroundColor Cyan
    
    $loginData = @{
        email = "admin@wz.com"
        password = "123456"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
        
        Write-Host "✅ 登录测试成功!" -ForegroundColor Green
        Write-Host "📊 响应数据:" -ForegroundColor Blue
        $response | ConvertTo-Json -Depth 2 | Write-Host -ForegroundColor White
        return $true
        
    } catch {
        Write-Host "❌ 登录测试失败: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 端口连接测试
function Test-PortConnection {
    param([string]$HostName, [int]$Port)
    
    Write-Host "🔌 测试端口连接 $HostName`:$Port" -ForegroundColor Cyan
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($HostName, $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(5000, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
            Write-Host "✅ 端口连接成功" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ 端口连接超时" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ 端口连接失败: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        if ($tcpClient) {
            $tcpClient.Close()
        }
    }
}

# 主测试流程
Write-Host "🚀 开始API连接测试..." -ForegroundColor Magenta
Write-Host ""

# 1. 端口连接测试
$portTest = Test-PortConnection -HostName "localhost" -Port 3001
if (-not $portTest) {
    Write-Host ""
    Write-Host "❌ 端口连接失败，请检查:" -ForegroundColor Red
    Write-Host "   1. 后端服务是否正在运行" -ForegroundColor White
    Write-Host "   2. 防火墙是否阻止连接" -ForegroundColor White
    Write-Host "   3. 端口是否被其他程序占用" -ForegroundColor White
    exit 1
}

Write-Host ""

# 2. 健康检查测试
$healthTest = Test-HealthEndpoint -Url $BaseUrl -Retries $MaxRetries -Delay $RetryDelay

Write-Host ""

# 3. 登录测试
if ($healthTest) {
    $loginTest = Test-LoginEndpoint -Url $BaseUrl
} else {
    Write-Host "⚠️  跳过登录测试（健康检查失败）" -ForegroundColor Yellow
}

Write-Host ""

# 测试结果总结
Write-Host "📋 测试结果总结:" -ForegroundColor Magenta
Write-Host "   端口连接: $(if($portTest){'✅ 成功'}else{'❌ 失败'})" -ForegroundColor $(if($portTest){'Green'}else{'Red'})
Write-Host "   健康检查: $(if($healthTest){'✅ 成功'}else{'❌ 失败'})" -ForegroundColor $(if($healthTest){'Green'}else{'Red'})
Write-Host "   登录测试: $(if($loginTest){'✅ 成功'}elseif($healthTest){'❌ 失败'}else{'⚠️  跳过'})" -ForegroundColor $(if($loginTest){'Green'}elseif($healthTest){'Red'}else{'Yellow'})

if ($healthTest) {
    Write-Host ""
    Write-Host "🎉 API连接正常！可以正常使用了。" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ API连接异常，请检查服务器状态。" -ForegroundColor Red
    exit 1
}
