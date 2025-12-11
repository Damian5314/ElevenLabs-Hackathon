@echo off
REM LifeAdmin Voice Agent - Windows Startup Script
REM ==============================================

echo ==================================================
echo   LifeAdmin Voice Agent - Startup
echo ==================================================
echo.

REM Check if .env exists
if not exist "backend\.env" (
    echo Warning: backend\.env not found
    echo Creating from .env.example...
    copy backend\.env.example backend\.env
    echo.
    echo IMPORTANT: Edit backend\.env with your API keys!
    echo.
    pause
)

REM Install dependencies if needed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ==================================================
echo   Starting Services
echo ==================================================
echo.

REM Start Backend in new window
echo Starting Backend on port 3001...
start "LifeAdmin Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment
timeout /t 3 /nobreak > nul

REM Start Frontend in new window
echo Starting Frontend on port 3000...
start "LifeAdmin Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==================================================
echo   Services Started!
echo ==================================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001
echo   Health:    http://localhost:3001/api/health
echo.
echo   Dummy Sites (served by backend):
echo   - Tandarts: http://localhost:3001/tandarts.html
echo   - Event:    http://localhost:3001/event.html
echo.
echo ==================================================
echo   n8n Setup (optional, for recurring tasks)
echo ==================================================
echo.
echo   1. Start n8n:  npx n8n
echo   2. Open:       http://localhost:5678
echo   3. Import:     n8n/workflows/lifeadmin-check-workflows.json
echo   4. Activate the workflow
echo.
echo ==================================================
echo.
echo Close this window to keep services running.
echo Close the Backend/Frontend windows to stop them.
echo.
pause
