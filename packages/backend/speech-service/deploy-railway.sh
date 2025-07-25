#!/bin/bash

# Railway.app WhisperX Deployment Script
# Super simple deployment - no AWS permissions needed!

set -e

echo "🚀 Railway.app WhisperX Deployment"
echo "=================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "🔐 Login to Railway..."
railway login

echo "🎯 Creating new Railway project..."
railway init

echo "📤 Deploying WhisperX to Railway..."
railway up

echo ""
echo "🎉 WhisperX Deployed to Railway!"
echo "================================"
echo ""
echo "📝 Next Steps:"
echo "1. Go to: https://railway.app/dashboard"
echo "2. Find your project and get the public URL"
echo "3. Update your frontend:"
echo "   export REACT_APP_SPEECH_SERVICE_URL='wss://YOUR_RAILWAY_URL/ws/transcribe'"
echo ""
echo "💰 Cost: ~$5-10/month (includes free tier)"
echo "🔗 Dashboard: https://railway.app/dashboard" 