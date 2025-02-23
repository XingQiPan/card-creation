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

:: 检查前端 package.json 是否存在
if not exist "package.json" (
    echo [错误] 未找到 package.json 文件
    echo 请确保您在正确的项目目录中运行此脚本
    pause
    exit
)

:: 检查后端目录是否存在
if not exist "backend\" (
    echo 正在创建后端目录...
    mkdir backend
    cd backend
    echo 正在初始化后端项目...
    call npm init -y
    call npm install express multer cors
    cd ..
)

:: 检查后端依赖
cd backend
if not exist "node_modules\" (
    echo 正在安装后端依赖...
    call npm install
)
cd ..

:: 检查前端依赖
if not exist "node_modules\" (
    echo 正在安装前端依赖...
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

:: 启动前端和后端服务
echo 正在启动服务...
start cmd /k "cd backend && node server.js"
start cmd /k "npm run dev"

echo 服务已启动！
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3000

pause 