@echo off
:: Set console codepage to UTF-8
chcp 65001 >nul
:: Set console title and color
cmd /c title "StarCard Writer Dev"
color 0A

echo [INFO] Starting environment check...

:: Check and kill processes using ports 3000 and 8888
echo [INFO] Checking port availability...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000\|:8888"') do (
    echo [WARNING] Port in use by PID %%a, killing process...
    taskkill /f /pid %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Successfully killed process %%a
    ) else (
        echo [ERROR] Failed to kill process %%a
    )
)


:: Check if Node.js is installed
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit
)

if not exist "package.json" (
    echo [ERROR] package.json not found
    echo Please make sure you are in the correct project directory
    pause
    exit
)

if not exist "backend\" (
    echo [INFO] Creating backend directory...
    mkdir backend
    cd backend
    echo [INFO] Initializing backend project...
    
    :: Create package.json
    echo {> package.json
    echo   "name": "card-creation-backend",>> package.json
    echo   "version": "1.1.0",>> package.json
    echo   "type": "module",>> package.json
    echo   "main": "server.js",>> package.json
    echo   "scripts": {>> package.json
    echo     "start": "node server.js">> package.json
    echo   },>> package.json
    echo   "dependencies": {>> package.json
    echo     "@xenova/transformers": "^2.17.2",>> package.json
    echo     "better-sqlite3": "^11.9.1",>> package.json
    echo     "cors": "^2.8.5",>> package.json
    echo     "express": "^4.18.2",>> package.json
    echo     "multer": "^1.4.5-lts.1",>> package.json
    echo     "python-shell": "^5.0.0",>> package.json
    echo     "uuid": "^11.1.0">> package.json
    echo     "cors": "^2.8.5",>> package.json
    echo     "better-sqlite3": "^11.9.1">> package.json
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
) else (
    :: Check specific required dependencies
    echo [INFO] Checking backend dependencies...
    
    :: Check if better-sqlite3 is installed
    if not exist "node_modules\better-sqlite3" (
        echo [INFO] Installing better-sqlite3...
        call npm install better-sqlite3 --save
    )
    
    :: Check if uuid is installed
    if not exist "node_modules\uuid" (
        echo [INFO] Installing uuid...
        call npm install uuid --save
    )
    
    :: Check if express is installed
    if not exist "node_modules\express" (
        echo [INFO] Installing express...
        call npm install express --save
    )
    
    :: Check if multer is installed
    if not exist "node_modules\multer" (
        echo [INFO] Installing multer...
        call npm install multer --save
    )
    
    :: Check if cors is installed
    if not exist "node_modules\cors" (
        echo [INFO] Installing cors...
        call npm install cors --save
    )
)

:: Create required directories
if not exist "backend\data" (
    echo [INFO] Creating data directory...
    mkdir "backend\data"
)

if not exist "backend\uploads" (
    echo [INFO] Creating uploads directory...
    mkdir "backend\uploads"
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
start cmd /c "cd backend && cmd /c title Backend-Service && color 0B && node start.js"
start cmd /c "cmd /c title Frontend-Service && color 0E && npm run dev"

echo [SUCCESS] Services started successfully!
echo [INFO] Frontend URL: http://localhost:8888
echo [INFO] Backend URL: http://localhost:3000
echo [INFO] Database: SQLite (file-based, stored in backend/data/app.db)

pause