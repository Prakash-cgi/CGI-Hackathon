# Setup Public Access for Code Analyzer Application
# This script configures Google Cloud Platform firewall rules for public access

Write-Host "🚀 Setting up public access for Code Analyzer Application..." -ForegroundColor Green

# Get the current project ID
$PROJECT_ID = gcloud config get-value project 2>$null

if (-not $PROJECT_ID) {
    Write-Host "❌ Error: No Google Cloud project configured" -ForegroundColor Red
    Write-Host "Please run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Project ID: $PROJECT_ID" -ForegroundColor Cyan

# Create firewall rule for frontend (port 3000)
Write-Host "🔧 Creating firewall rule for frontend (port 3000)..." -ForegroundColor Yellow
gcloud compute firewall-rules create allow-code-analyzer-frontend `
    --allow tcp:3000 `
    --source-ranges 0.0.0.0/0 `
    --description "Allow public access to Code Analyzer frontend" `
    --project=$PROJECT_ID

# Create firewall rule for backend (port 5001)
Write-Host "🔧 Creating firewall rule for backend (port 5001)..." -ForegroundColor Yellow
gcloud compute firewall-rules create allow-code-analyzer-backend `
    --allow tcp:5001 `
    --source-ranges 0.0.0.0/0 `
    --description "Allow public access to Code Analyzer backend" `
    --project=$PROJECT_ID

# Get external IP
$EXTERNAL_IP = (Invoke-WebRequest -Uri "https://ifconfig.me" -UseBasicParsing).Content
Write-Host "🌐 External IP: $EXTERNAL_IP" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Public access setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Your application is now accessible at:" -ForegroundColor Cyan
Write-Host "   Frontend: http://$EXTERNAL_IP:3000" -ForegroundColor White
Write-Host "   Backend:  http://$EXTERNAL_IP:5001" -ForegroundColor White
Write-Host ""
Write-Host "📝 Share these URLs with others to access your application publicly!" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Security Note: These ports are now open to the public internet." -ForegroundColor Red
Write-Host "   Make sure your application has proper security measures in place." -ForegroundColor Red

