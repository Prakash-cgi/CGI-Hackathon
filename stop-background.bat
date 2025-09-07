@echo off
echo Stopping Code Modernization Analyzer Services...
echo ================================================

REM Stop all PM2 processes
pm2 stop all

REM Delete all PM2 processes
pm2 delete all

echo.
echo All services have been stopped and removed.
echo.
pause
