Write-Host "Starting Code Modernization Analyzer in Background..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Kill any existing PM2 processes
pm2 delete all 2>$null

# Start services with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Show status
pm2 status

Write-Host ""
Write-Host "Services are now running in background!" -ForegroundColor Green
Write-Host ""
Write-Host "Useful PM2 commands:" -ForegroundColor Yellow
Write-Host "  pm2 status          - Check service status" -ForegroundColor Cyan
Write-Host "  pm2 logs            - View all logs" -ForegroundColor Cyan
Write-Host "  pm2 logs server     - View server logs only" -ForegroundColor Cyan
Write-Host "  pm2 logs client     - View client logs only" -ForegroundColor Cyan
Write-Host "  pm2 restart all     - Restart all services" -ForegroundColor Cyan
Write-Host "  pm2 stop all        - Stop all services" -ForegroundColor Cyan
Write-Host "  pm2 delete all      - Remove all services" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host "Backend:  http://localhost:5001" -ForegroundColor Magenta
Write-Host ""

Read-Host "Press Enter to continue"
