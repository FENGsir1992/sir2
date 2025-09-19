@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "DEST=%USERPROFILE%\pwsh74"
if not exist "%DEST%" mkdir "%DEST%"
set "ZIP=%DEST%\pwsh.zip"
set "URL=https://github.com/PowerShell/PowerShell/releases/download/v7.4.5/PowerShell-7.4.5-win-x64.zip"

echo Downloading PowerShell 7.4.5...
where curl >nul 2>nul
if %ERRORLEVEL%==0 (
	curl -L -o "%ZIP%" "%URL%"
) else (
	certutil -urlcache -split -f "%URL%" "%ZIP%"
)

echo Extracting...
where tar >nul 2>nul
if %ERRORLEVEL%==0 (
	tar -xf "%ZIP%" -C "%DEST%"
) else (
	"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Add-Type -A System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory('%ZIP%', '%DEST%')"
)

del "%ZIP%" 2>nul

set "PWSH_EXE="
for /r "%DEST%" %%F in (pwsh.exe) do (
	set "PWSH_EXE=%%~fF"
	goto :found
)
:found
if not defined PWSH_EXE (
	echo ERROR: pwsh.exe not found
	exit /b 1
)

echo Installed at: %PWSH_EXE%
"%PWSH_EXE%" -NoLogo -NoProfile -NonInteractive -Command "$PSVersionTable.PSVersion"
exit /b 0

