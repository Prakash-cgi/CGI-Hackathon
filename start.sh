#!/bin/bash

echo "🚀 Starting Code Modernization Analyzer..."
echo ""

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Setting up environment file..."
    cp server/env.example server/.env
    echo "📝 Please edit server/.env and add your GEMINI_API_KEY"
    echo "   Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
fi

# Start the application
echo "🌐 Starting servers..."
echo "   Frontend: http://34.135.103.183:3000"
echo "   Backend:  http://34.135.103.183:5001"
echo ""
echo "✨ Sample code is pre-loaded - try 'Analyze All' to see the magic!"
echo ""

npm run dev
