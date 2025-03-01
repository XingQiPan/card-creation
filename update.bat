@echo off
echo ====== 开始同步代码 ======
echo.

:: 检查 Git 是否安装
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误：未检测到 Git，请先安装 Git
    pause
    exit /b
)

:: 备份当前目录路径
set current_dir=%cd%

:: 检查并备份 backend/data 目录
if exist "backend\data" (
    echo 正在备份 backend/data 目录...
    mkdir ..\data_backup 2>nul
    xcopy /E /I /Y "backend\data" "..\data_backup"
)

:: 切换到上级目录
cd ..

:: 删除原文件夹(除了备份)并克隆新代码
rmdir /s /q card-creation-main
git clone https://github.com/XingQiPan/card-creation.git card-creation-main

:: 恢复 backend/data 目录
if exist "data_backup" (
    echo 正在恢复 backend/data 目录...
    mkdir "card-creation-main\backend\data" 2>nul
    xcopy /E /I /Y "data_backup" "card-creation-main\backend\data"
    rmdir /s /q data_backup
)

:: 切回原目录
cd %current_dir%

echo.
echo ====== 同步完成 ======
pause