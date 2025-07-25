#!/bin/bash

# Speech Service Startup Script
echo "🎤 Starting Speech Transcription Service..."

# Check for Python 3.11 (required for WhisperX compatibility)
python_cmd=""
if command -v python3.11 &> /dev/null; then
    python_cmd="python3.11"
elif command -v python3.10 &> /dev/null; then
    python_cmd="python3.10"
elif command -v python3.9 &> /dev/null; then
    python_cmd="python3.9"
else
    echo "❌ Python 3.9-3.11 is required for WhisperX compatibility"
    echo "📥 Install with: brew install python@3.11"
    exit 1
fi

echo "🐍 Using Python: $(which $python_cmd)"
echo "📦 Python version: $($python_cmd --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    $python_cmd -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade pip
echo "🔧 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "❌ requirements.txt not found"
    exit 1
fi

# Check for GPU support
echo "🖥️  Checking GPU support..."
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected"
    nvidia-smi --query-gpu=name --format=csv,noheader
else
    echo "⚠️  No NVIDIA GPU detected, will use CPU (slower)"
fi

# Start the service
echo "🚀 Starting Speech Transcription Service..."
echo "📡 Service will be available at: http://localhost:8000"
echo "🔌 WebSocket endpoint: ws://localhost:8000/ws/transcribe"
echo "📁 Working directory: $(pwd)"
echo ""

# Ensure we're in the correct directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📂 Running from: $(pwd)"

$python_cmd main.py 