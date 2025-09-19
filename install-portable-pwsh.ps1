$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Ensure TLS 1.2+ for downloads
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072
} catch {
}

$dest = Join-Path $env:USERPROFILE 'pwsh74'
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

$zipPath = Join-Path $dest 'pwsh.zip'
$pwshExe = $null

# Reuse existing pwsh if already installed in target folder
$existing = Get-ChildItem -Path $dest -Recurse -Filter 'pwsh.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
    $pwshExe = $existing.FullName
}

if (-not $pwshExe) {
    $arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
    $version = '7.4.5'
    $fileName = "PowerShell-$version-win-$arch.zip"
    $url = "https://github.com/PowerShell/PowerShell/releases/download/v$version/$fileName"

    Write-Host "Downloading PowerShell $version ($arch) ..." -ForegroundColor Cyan
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zipPath

    Write-Host 'Extracting...' -ForegroundColor Cyan
    try {
        Expand-Archive -LiteralPath $zipPath -DestinationPath $dest -Force
    } catch {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $dest)
    }
    Remove-Item $zipPath -Force

    $found = Get-ChildItem -Path $dest -Recurse -Filter 'pwsh.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $found) {
        throw 'pwsh.exe not found after extraction.'
    }
    $pwshExe = $found.FullName
}

# Set execution policy for CurrentUser in pwsh (no admin required)
& $pwshExe -NoLogo -NoProfile -NonInteractive -Command "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"

# Print pwsh version to confirm
& $pwshExe -NoLogo -NoProfile -NonInteractive -Command "$PSVersionTable.PSVersion.ToString()"

