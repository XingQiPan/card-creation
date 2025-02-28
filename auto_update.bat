@echo off
setlocal enabledelayedexpansion

:: 接收下载URL作为参数
set "DOWNLOAD_URL=%~1"
set "TEMP_DIR=%TEMP%\XingKaUpdate"
set "DOWNLOAD_PATH=%TEMP_DIR%\update_setup.exe"

:: 创建临时目录
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo 正在下载更新安装包...
:: 使用 PowerShell 下载文件
powershell -Command "& {Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%DOWNLOAD_PATH%'}"

if not exist "%DOWNLOAD_PATH%" (
    echo 下载失败！
    pause
    exit /b 1
)

echo 下载完成，准备安装更新...

:: 从注册表获取安装路径
for /f "tokens=2*" %%a in ('reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe" /ve') do set "INSTALL_PATH=%%b"
set "INSTALL_DIR=%~dp0"

:: 检查自动更新设置
set "AUTO_UPDATE="
if exist "%INSTALL_DIR%autoupdate.txt" set /p AUTO_UPDATE=<"%INSTALL_DIR%autoupdate.txt"

:: 检查桌面快捷方式
set "DESKTOP_SHORTCUT="
if exist "%PUBLIC%\Desktop\星卡写作.lnk" set "DESKTOP_SHORTCUT=1"
if exist "%USERPROFILE%\Desktop\星卡写作.lnk" set "DESKTOP_SHORTCUT=1"

:: 关闭正在运行的程序
taskkill /F /IM "星卡写作.exe" /T
timeout /t 2 /nobreak > nul

echo 正在安装更新...
:: 构建安装参数
set "INSTALL_PARAMS=/VERYSILENT /DIR="%INSTALL_DIR%""
if "%AUTO_UPDATE%"=="true" set "INSTALL_PARAMS=%INSTALL_PARAMS% /TASKS="autoupdate""
if defined DESKTOP_SHORTCUT set "INSTALL_PARAMS=%INSTALL_PARAMS% /TASKS="desktopicon""

:: 执行静默安装
"%DOWNLOAD_PATH%" %INSTALL_PARAMS%

:: 等待安装完成
timeout /t 5 /nobreak > nul

:: 清理临时文件
del "%DOWNLOAD_PATH%"

:: 重启应用
echo 正在重启应用...
start "" "%INSTALL_PATH%"
if errorlevel 1 (
    echo 重启失败，请手动启动程序
    timeout /t 3 /nobreak > nul
) else (
    echo 更新完成，程序已重启！
    timeout /t 2 /nobreak > nul
)

exit