# 🍔 Agentic POS System

An intelligent Point of Sale system powered by AI agents, featuring voice ordering, Solana payments, and real-time kitchen management.

## 🏗️ Architecture

```
agentic-pos/
├── packages/backend/           # Backend services
│   ├── shared/                 # Shared types & interfaces
│   ├── server/                 # Main API server (Express + Socket.IO)
│   ├── payments/               # Solana payment processing
│   └── ai-agent/               # AWS Comprehend + AI processing
└── packages/frontend/          # Frontend applications
    ├── client/                 # Customer ordering interface
    ├── kitchen-display/        # Kitchen order management
    └── manager-console/        # Management dashboard
```

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Required
node >= 18.0.0
npm >= 8.0.0
docker & docker-compose

# Optional (for development)
MongoDB Compass (for database GUI)
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Database
MONGO_URI=mongodb://localhost:27017/agentic-pos

# Solana Configuration (Use devnet for development)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_PRIVATE_KEY=your_solana_private_key_here

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

# Development
NODE_ENV=development
LOG_LEVEL=debug

# CORS Origins (for frontend development)
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

### 3. Installation

```bash
# Install all dependencies
npm run install:all

# Or step by step:
npm install                    # Root dependencies
npm run install:backend       # Backend packages
npm run install:frontend      # Frontend packages
```

### 4. Start Development

```bash
# Start MongoDB
npm run docker:up

# Start all services (recommended)
npm run dev

# Or start services individually:
npm run dev:backend           # All backend services
npm run dev:frontend          # All frontend apps
npm run dev:server            # Just the API server
npm run dev:payments          # Just payments service
npm run dev:ai-agent          # Just AI agent
npm run dev:client            # Just customer app
npm run dev:kitchen           # Just kitchen display
npm run dev:manager           # Just manager console
```

## 🌐 Service URLs

Once running, access the applications at:

| Service | URL | Purpose |
|---------|-----|---------|
| **Customer App** | http://localhost:5173 | Voice ordering interface |
| **Kitchen Display** | http://localhost:5174 | Order management for kitchen |
| **Manager Console** | http://localhost:5175 | Analytics & management |
| **API Server** | http://localhost:4000 | Main backend API |
| **Payments Service** | http://localhost:4001 | Solana payment processing |
| **AI Agent** | http://localhost:4002 | AI processing service |
| **MongoDB** | mongodb://localhost:27017 | Database |

## 🎯 Development Workflow

### Backend Development

```bash
# Build shared types first
cd packages/backend/shared && npm run build

# Start developing a service
cd packages/backend/server && npm run dev

# Build all backend services
npm run build:backend
```

### Frontend Development

```bash
# Start a specific frontend app
cd packages/frontend/client && npm run dev

# Build all frontend apps
npm run build:frontend
```

### Full System Testing

```bash
# Clean everything
npm run clean

# Full rebuild
npm run build

# Start everything
npm run dev
```

## 🛠️ Development Features

### Customer App (Port 5173)
- 🎤 **Voice Recording**: Hold button to record orders
- 📱 **Solana QR Codes**: Payment via cryptocurrency
- 🔄 **Real-time Updates**: Order status via WebSocket

### Kitchen Display (Port 5174)
- 📋 **Order Tickets**: Visual order management
- 🔊 **Audio Alerts**: Sound notifications for new orders
- ✅ **Order Completion**: Mark orders as complete

### Manager Console (Port 5175)
- 📊 **Live Dashboard**: Real-time order statistics
- 📈 **Analytics**: Order trends and performance
- 🌐 **Multi-language Support**: Track order languages

## 🐳 Docker Development

```bash
# Start MongoDB only
docker-compose up mongo -d

# Build and start full stack
npm run docker:build
npm run docker:up

# Stop services
npm run docker:down
```

## 📁 Project Structure Details

### Backend Services

- **`shared/`**: Common TypeScript interfaces used across all services
- **`server/`**: Main Express API with Socket.IO for real-time communication
- **`payments/`**: Solana blockchain integration for cryptocurrency payments  
- **`ai-agent/`**: AWS Comprehend for voice processing + AI features

### Frontend Apps

- **`client/`**: React customer interface with voice recording
- **`kitchen-display/`**: React kitchen management system
- **`manager-console/`**: React analytics and management dashboard

## 🔧 Common Commands

```bash
# Development
npm run dev                    # Start everything
npm run dev:backend           # Backend only
npm run dev:frontend          # Frontend only

# Building
npm run build                 # Build everything
npm run build:backend         # Backend only
npm run build:frontend        # Frontend only

# Utilities
npm run clean                 # Clean all build artifacts
npm run install:all           # Install all dependencies
npm run docker:up             # Start MongoDB
npm run docker:down           # Stop Docker services
```

## 🚨 Troubleshooting

### MongoDB Connection Issues
```bash
# Make sure MongoDB is running
npm run docker:up

# Check if container is healthy
docker ps
```

### TypeScript Errors
```bash
# Rebuild shared types
cd packages/backend/shared && npm run build

# Clean and rebuild everything
npm run clean && npm run build
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :4000
lsof -i :5173

# Kill processes if needed
kill -9 <PID>
```

## 🎉 Next Steps

1. **Configure APIs**: Add your Solana, AWS, and Rime API keys to `.env`
2. **Test Voice Recording**: Use the customer app voice interface
3. **Set up Payments**: Configure Solana wallet for transactions
4. **Customize UI**: Modify React components for your branding
5. **Add Menu Items**: Extend the shared types and database models

Happy coding! 🚀 