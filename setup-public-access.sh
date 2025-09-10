#!/bin/bash

# Setup Public Access for Code Analyzer Application
# This script configures Google Cloud Platform firewall rules for public access

echo "🚀 Setting up public access for Code Analyzer Application..."

# Get the current project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project configured"
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Project ID: $PROJECT_ID"

# Create firewall rule for frontend (port 3000)
echo "🔧 Creating firewall rule for frontend (port 3000)..."
gcloud compute firewall-rules create allow-code-analyzer-frontend \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow public access to Code Analyzer frontend" \
    --project=$PROJECT_ID

# Create firewall rule for backend (port 5001)
echo "🔧 Creating firewall rule for backend (port 5001)..."
gcloud compute firewall-rules create allow-code-analyzer-backend \
    --allow tcp:5001 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow public access to Code Analyzer backend" \
    --project=$PROJECT_ID

# Get external IP
EXTERNAL_IP=$(curl -s ifconfig.me)
echo "🌐 External IP: $EXTERNAL_IP"

echo ""
echo "✅ Public access setup complete!"
echo ""
echo "🔗 Your application is now accessible at:"
echo "   Frontend: http://$EXTERNAL_IP:3000"
echo "   Backend:  http://$EXTERNAL_IP:5001"
echo ""
echo "📝 Share these URLs with others to access your application publicly!"
echo ""
echo "⚠️  Security Note: These ports are now open to the public internet."
echo "   Make sure your application has proper security measures in place."

