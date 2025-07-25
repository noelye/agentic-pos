#!/bin/bash

# AWS EC2 WhisperX Deployment Script
# Usage: ./deploy-aws.sh

set -e

echo "🚀 AWS WhisperX Deployment Script"
echo "=================================="

# Configuration
INSTANCE_TYPE="g4dn.xlarge"  # GPU instance (change to m5.large for CPU-only)
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2 AMI (update for your region)
KEY_NAME="whisper-keypair"  # Your EC2 key pair name
SECURITY_GROUP="whisper-sg"
INSTANCE_NAME="whisperx-server"

echo "📋 Configuration:"
echo "   Instance Type: $INSTANCE_TYPE"
echo "   AMI ID: $AMI_ID"
echo "   Key Pair: $KEY_NAME"
echo ""

# Create security group if it doesn't exist
echo "🔐 Setting up security group..."
aws ec2 describe-security-groups --group-names $SECURITY_GROUP >/dev/null 2>&1 || {
    echo "   Creating security group: $SECURITY_GROUP"
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP \
        --description "WhisperX Speech Service Security Group" \
        --query 'GroupId' \
        --output text)
    
    # Allow SSH access
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0
    
    # Allow WhisperX service access
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 8000 \
        --cidr 0.0.0.0/0
        
    echo "   Security group created: $SECURITY_GROUP_ID"
}

# Create user data script for instance initialization
cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y docker git python3 python3-pip

# Install Docker and start service
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Python 3.11
amazon-linux-extras install python3.8 -y
wget https://www.python.org/ftp/python/3.11.7/Python-3.11.7.tgz
tar xzf Python-3.11.7.tgz
cd Python-3.11.7
./configure --enable-optimizations
make altinstall
ln -sf /usr/local/bin/python3.11 /usr/bin/python3.11

# Clone the project (you'll need to update this with your repo)
cd /home/ec2-user
git clone https://github.com/your-username/agent-pos.git || {
    mkdir -p agent-pos/packages/backend/speech-service
    cd agent-pos/packages/backend/speech-service
}

# Create the WhisperX service files
cat > requirements.txt << 'EOL'
whisperx>=3.1.1
torch>=2.0.0
torchaudio>=2.0.0
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
websockets>=12.0
python-multipart>=0.0.6
numpy>=1.24.0
scipy>=1.10.0
librosa>=0.10.0
soundfile>=0.12.0
python-dotenv>=1.0.0
aiofiles>=23.0.0
EOL

# Set up virtual environment and install dependencies
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create systemd service for auto-start
cat > /etc/systemd/system/whisperx.service << 'EOL'
[Unit]
Description=WhisperX Speech Transcription Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/agent-pos/packages/backend/speech-service
Environment=PATH=/home/ec2-user/agent-pos/packages/backend/speech-service/venv/bin
ExecStart=/home/ec2-user/agent-pos/packages/backend/speech-service/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOL

systemctl daemon-reload
systemctl enable whisperx
EOF

echo "🎯 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-groups $SECURITY_GROUP \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"
echo "⏳ Waiting for instance to be running..."

aws ec2 wait instance-running --instance-ids $INSTANCE_ID

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "🎉 WhisperX Server Deployed Successfully!"
echo "========================================"
echo "📍 Instance ID: $INSTANCE_ID"
echo "🌐 Public IP: $PUBLIC_IP"
echo "🔗 Service URL: http://$PUBLIC_IP:8000"
echo "🔌 WebSocket: ws://$PUBLIC_IP:8000/ws/transcribe"
echo ""
echo "📝 Next Steps:"
echo "1. Wait 5-10 minutes for setup to complete"
echo "2. Test: curl http://$PUBLIC_IP:8000/health"
echo "3. Update your frontend to use: ws://$PUBLIC_IP:8000/ws/transcribe"
echo "4. SSH access: ssh -i ~/.ssh/$KEY_NAME.pem ec2-user@$PUBLIC_IP"
echo ""
echo "💰 Estimated cost: ~$0.526/hour (remember to stop when done!)"
echo "🛑 To stop: aws ec2 stop-instances --instance-ids $INSTANCE_ID"

# Clean up temporary files
rm -f user-data.sh 