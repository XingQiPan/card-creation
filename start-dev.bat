@echo off
:: Set console codepage to UTF-8
chcp 65001 >nul
:: Set console title and color
cmd /c title "StarCard Writer Dev"
color 0A

echo [INFO] Starting environment check...

:: Check if Node.js is installed
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit
)

:: Check if frontend package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo Please make sure you are in the correct project directory
    pause
    exit
)

:: Check if backend directory exists
if not exist "backend\" (
    echo [INFO] Creating backend directory...
    mkdir backend
    cd backend
    echo [INFO] Initializing backend project...
    call npm init -y
    
    :: Create package.json
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

:: Check backend dependencies
cd backend
if not exist "node_modules\" (
    echo [INFO] Installing backend dependencies...
    call npm install
)
cd ..

:: Check frontend dependencies
if not exist "node_modules\" (
    echo [INFO] Installing frontend dependencies...
    call npm install --registry=https://registry.npmmirror.com
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        echo Please try running these commands manually:
        echo npm install --registry=https://registry.npmmirror.com
        echo or
        echo npm install
        pause
        exit
    )
)

:: Start frontend and backend services
echo [INFO] Starting services...
start cmd /c "cd backend && cmd /c title Backend-Service && color 0B && node server.js"
start cmd /c "cmd /c title Frontend-Service && color 0E && npm run dev"

echo [SUCCESS] Services started successfully!
echo [INFO] Frontend URL: http://localhost:5173
echo [INFO] Backend URL: http://localhost:3000

pause 