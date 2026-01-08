@echo off
echo ========================================
echo   LMS Automation Backend - Docker Stop
echo ========================================
echo.

echo Stopping all services...
docker-compose down
if errorlevel 1 (
    echo ERROR: Failed to stop services!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   All services stopped successfully!
echo ========================================
echo.
echo To start again: run start.bat
echo.
pause
