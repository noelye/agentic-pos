# 🚀 AWS WhisperX Deployment Guide

Deploy WhisperX on AWS for fast, scalable speech transcription.

## 🎯 Quick Start

### Prerequisites
```bash
# Install AWS CLI
brew install awscli  # macOS
# or: pip install awscli

# Configure AWS credentials
aws configure
```

### Option 1: Automated EC2 Deployment ⭐ **Recommended**

```bash
cd packages/backend/speech-service

# 1. Create EC2 key pair (one-time setup)
aws ec2 create-key-pair --key-name whisper-keypair --query 'KeyMaterial' --output text > ~/.ssh/whisper-keypair.pem
chmod 400 ~/.ssh/whisper-keypair.pem

# 2. Deploy WhisperX server
chmod +x deploy-aws.sh
./deploy-aws.sh

# 3. Update your frontend
export REACT_APP_SPEECH_SERVICE_URL="ws://YOUR_EC2_IP:8000/ws/transcribe"
npm run dev:client
```

### Option 2: Docker + ECS (Advanced)

```bash
# Build and push to ECR
aws ecr create-repository --repository-name whisperx
docker build -t whisperx .
# ... (ECR push commands)
```

## 💰 Cost Estimation

| Instance Type | GPU | vCPU | RAM | Cost/Hour | Transcription Speed |
|---------------|-----|------|-----|-----------|-------------------|
| `m5.large`    | ❌  | 2    | 8GB | ~$0.096   | ~10-15 seconds    |
| `g4dn.xlarge` | ✅  | 4    | 16GB| ~$0.526   | ~1-3 seconds      |
| `p3.2xlarge`  | ✅  | 8    | 61GB| ~$3.060   | ~0.5-1 seconds    |

**💡 Tip**: Use `g4dn.xlarge` for best price/performance ratio.

## 🔧 Configuration

### Frontend Environment Variables

Create `.env.local` in `packages/frontend/client/`:

```bash
# Local development
REACT_APP_SPEECH_SERVICE_URL=ws://localhost:8000/ws/transcribe

# AWS production
REACT_APP_SPEECH_SERVICE_URL=ws://YOUR_EC2_IP:8000/ws/transcribe
```

### Security Group Ports

- **22** (SSH): For server access
- **8000** (HTTP/WS): WhisperX service

## 🧪 Testing

```bash
# Health check
curl http://YOUR_EC2_IP:8000/health

# WebSocket test
wscat -c ws://YOUR_EC2_IP:8000/ws/transcribe
```

## 🛑 Cost Management

```bash
# Stop instance (keeps storage, ~$0.10/month)
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Start instance
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Terminate instance (deletes everything)
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0
```

## 🔍 Troubleshooting

### SSH Access
```bash
ssh -i ~/.ssh/whisper-keypair.pem ec2-user@YOUR_EC2_IP
```

### Check Service Status
```bash
sudo systemctl status whisperx
sudo journalctl -u whisperx -f
```

### Manual Service Start
```bash
cd /home/ec2-user/agent-pos/packages/backend/speech-service
source venv/bin/activate
python main.py
```

## 🌟 Why AWS?

✅ **Fast Setup**: 5-10 minutes vs hours locally  
✅ **Better Performance**: GPU instances available  
✅ **Scalable**: Handle multiple users  
✅ **Cost Effective**: ~$1-5 for testing session  
✅ **No Local Storage**: 3GB+ stays on AWS  

## 📊 Performance Comparison

| Location | Model Download | Transcription | Total Test Time |
|----------|---------------|---------------|-----------------|
| Local    | 30-60 minutes | 10-15 seconds | 60+ minutes     |
| AWS      | 2-5 minutes   | 1-3 seconds   | 10 minutes      | 