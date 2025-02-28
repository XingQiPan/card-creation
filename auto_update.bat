@echo off
setlocal enabledelayedexpansion

:: 接收下载URL作为参数
set "DOWNLOAD_URL=%~1"
set "TEMP_DIR=%TEMP%\XingKaUpdate"
set "DOWNLOAD_PATH=%TEMP_DIR%\update.exe"

:: 创建临时目录
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo 正在下载更新...
:: 使用 PowerShell 下载文件
powershell -Command "& {Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%DOWNLOAD_PATH%'}"

if not exist "%DOWNLOAD_PATH%" (
    echo 下载失败！
    exit /b 1
)

echo 下载完成，准备安装更新...

:: 从注册表获取安装路径
for /f "tokens=2*" %%a in ('reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe" /ve') do set "INSTALL_PATH=%%b"

:: 关闭正在运行的程序
taskkill /F /IM "星卡写作.exe" /T
timeout /t 2 /nobreak > nul

:: 替换可执行文件
copy /Y "%DOWNLOAD_PATH%" "%INSTALL_PATH%"

:: 清理临时文件
del "%DOWNLOAD_PATH%"

:: 重启应用
start "" "%INSTALL_PATH%"

exit