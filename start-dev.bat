@echo off
chcp 65001 >nul
echo 正在检查环境...

:: 检查 Node.js 是否安装
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 您可以从这里下载：https://nodejs.org/
    pause
    exit
)

:: 检查 package.json 是否存在
if not exist "package.json" (
    echo [错误] 未找到 package.json 文件
    echo 请确保您在正确的项目目录中运行此脚本
    pause
    exit
)

:: 检查是否存在 node_modules 目录
if not exist "node_modules\" (
    echo 正在安装依赖...
    call npm install --registry=https://registry.npmmirror.com
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        echo 请尝试手动运行以下命令：
        echo npm install --registry=https://registry.npmmirror.com
        echo 或者
        echo npm install
        pause
        exit
    )
)

:: 启动开发服务器
echo 正在启动开发服务器...
npm run dev
::start http://localhost:8888

pause 