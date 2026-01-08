@echo off
echo ========================================
echo   LMS Automation Backend - Restart
echo ========================================
echo.

echo Restarting all services...
docker-compose restart

echo.
echo ========================================
echo   Services restarted successfully!
echo ========================================
echo.
pause
