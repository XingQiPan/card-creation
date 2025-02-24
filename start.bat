@echo off
chcp 65001 >nul
cmd /c title "StarCard Writer"
color 0A

:menu
cls
echo ================================
echo        StarCard Writer
echo ================================
echo Enter 1 to Start
echo ================================

set /p choice=Please select mode (enter number): 

if "%choice%"=="1" (
    start start-dev.bat
    exit
)

echo.
echo Invalid input, please try again!
timeout /t 2 >nul
goto menu 