#!/bin/bash

echo "🍔 Setting up Agentic POS Development Environment"
echo "================================================"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file from template..."
    cat > .env << 'EOF'
# Database
MONGO_URI=mongodb://localhost:27017/agentic-pos

# Solana Configuration (Use devnet for development)
SOLANA_RPC_URL=https://api.devnet.solana.com
# Your merchant wallet's PUBLIC address (where payments will be sent)
# Leave as 'your_merchant_wallet_address_here' for development (generates temporary wallet)
MERCHANT_WALLET_ADDRESS=your_merchant_wallet_address_here
# Helius API key for transaction monitoring (optional but recommended)
HELIUS_API_KEY=your_helius_api_key_here

# AWS Configuration (for AI Agent)
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here

# Rime AI API (for Text-to-Speech)
RIME_API_KEY=your_rime_api_key_here

# Service Ports
SERVER_PORT=4000
PAYMENTS_PORT=4001
AI_AGENT_PORT=4002
SPEECH_SERVICE_PORT=8000

# Development
NODE_ENV=development
LOG_LEVEL=debug

# CORS Origins (for frontend development)
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175
EOF
    echo "✅ .env file created! Please update it with your API keys."
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Build shared package
echo "🔨 Building shared package..."
npm run build:shared

# Start MongoDB
echo "🐳 Starting MongoDB with Docker..."
npm run docker:up

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Update your .env file with real API keys"
echo "2. Run 'npm run dev' to start all services"
echo "3. Open the apps in your browser:"
echo "   - Customer App: http://localhost:5173"
echo "   - Kitchen Display: http://localhost:5174" 
echo "   - Manager Console: http://localhost:5175"
echo ""
echo "Happy coding! 🚀" 