@echo off
echo ========================================
echo   LMS Automation Backend - Docker Start
echo ========================================
echo.

echo [1/3] Checking Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo Docker is running!
echo.

echo [2/3] Building Docker images...
echo This may take 5-10 minutes on first run...
docker-compose build
if errorlevel 1 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)
echo.

echo [3/3] Starting all services...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start services!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   All services started successfully!
echo ========================================
echo.
echo Services running:
echo   - API Server:          http://localhost:8000
echo   - Redis:               localhost:6379
echo   - Clone Worker:        Running in background
echo   - Assignment Worker:   Running in background
echo   - Lecture Worker:      Running in background
echo   - Notes Worker:        Running in background
echo.
echo To view logs:    docker-compose logs -f
echo To stop:         docker-compose down
echo To restart:      docker-compose restart
echo.
echo IMPORTANT: Complete Google OAuth setup by visiting:
echo http://localhost:8000/oauth2callback
echo.
pause
