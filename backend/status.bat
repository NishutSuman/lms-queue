@echo off
echo ========================================
echo   LMS Automation Backend - Status
echo ========================================
echo.

docker-compose ps

echo.
echo ========================================
echo   Service Health
echo ========================================
echo.

docker-compose exec -T redis redis-cli ping 2>nul
if errorlevel 1 (
    echo Redis:    NOT RUNNING
) else (
    echo Redis:    RUNNING
)

timeout /t 1 >nul
curl -s http://localhost:8000/test >nul 2>&1
if errorlevel 1 (
    echo API:      NOT RUNNING
) else (
    echo API:      RUNNING
)

echo.
pause
