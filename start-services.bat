@echo off
echo Starting Code Modernization Analyzer Services...
echo ================================================

REM Start the services
start "Code Analyzer Server" cmd /k "cd /d %~dp0server && npm run dev"
start "Code Analyzer Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Services are starting in separate windows...
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5001
echo Network:  http://10.10.18.2:3000
echo.
echo Close the command windows to stop the services.
echo.
pause
