@echo off
:: 设置控制台代码页为 UTF-8
chcp 65001 >nul
:: 设置控制台标题和颜色
cmd /c title "StarCard Writer Dev"
color 0A

echo [INFO] Starting environment check...

:: 检查 Node.js 是否安装
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Download from: https://nodejs.org/
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
    
    :: 创建 package.json
    echo {> package.json
    echo   "name": "starcard-backend",>> package.json
    echo   "version": "1.0.0",>> package.json
    echo   "type": "module",>> package.json
    echo   "dependencies": {>> package.json
    echo     "express": "^4.18.2",>> package.json
    echo     "multer": "^1.4.5-lts.1",>> package.json
    echo     "cors": "^2.8.5">> package.json
    echo   }>> package.json
    echo }>> package.json
    
    call npm install
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
echo [INFO] Starting services...
start cmd /c "cd backend && cmd /c title Backend-Service && color 0B && node server.js"
start cmd /c "cmd /c title Frontend-Service && color 0E && npm run dev"

echo [SUCCESS] 服务已启动！
echo [INFO] 前端地址: http://localhost:5173
echo [INFO] 后端地址: http://localhost:3000

pause 