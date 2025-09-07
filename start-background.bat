@echo off
echo Starting Code Modernization Analyzer in Background...
echo ==================================================

REM Kill any existing PM2 processes
pm2 delete all 2>nul

REM Start services with PM2
pm2 start ecosystem.config.js

REM Save PM2 configuration
pm2 save

REM Show status
pm2 status

echo.
echo Services are now running in background!
echo.
echo Useful PM2 commands:
echo   pm2 status          - Check service status
echo   pm2 logs            - View all logs
echo   pm2 logs server     - View server logs only
echo   pm2 logs client     - View client logs only
echo   pm2 restart all     - Restart all services
echo   pm2 stop all        - Stop all services
echo   pm2 delete all      - Remove all services
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5001
echo.
pause
