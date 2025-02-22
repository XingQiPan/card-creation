@echo off
chcp 65001 >nul
title 星卡写作启动器
color 0A

:menu
cls
echo ================================
echo        星卡写作启动器
echo ================================
echo 输入1启动
echo ================================

set /p choice=请选择启动模式（输入数字）: 

if "%choice%"=="1" (
    start start-dev.bat
    exit
)

echo.
echo 输入错误，请重新选择！
timeout /t 2 >nul
goto menu 