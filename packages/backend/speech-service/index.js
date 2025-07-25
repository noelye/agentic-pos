const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 8000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('🎤 Speech Transcription Service starting...');
console.log(`🔧 Port: ${PORT}`);
console.log(`🔑 OpenAI API key configured: ${OPENAI_API_KEY ? 'Yes' : 'No'}`);

if (!OPENAI_API_KEY) {
    console.error('⚠️  Warning: OPENAI_API_KEY environment variable not set');
}

// Health check endpoint (must be defined early)
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        service: 'OpenAI Whisper API',
        compute: 'external',
        openai_configured: !!OPENAI_API_KEY,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    };
    console.log('🏥 Health check requested:', health);
    res.status(200).json(health);
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Speech Transcription Service (OpenAI Whisper API)',
        status: 'running',
        endpoints: {
            health: '/health',
            websocket: '/ws/transcribe'
        }
    });
});

// WebSocket server for real-time transcription
const wss = new WebSocket.Server({ 
    server, 
    path: '/ws/transcribe',
    perMessageDeflate: false
});

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    
    ws.on('message', async (audioData) => {
        console.log(`📥 Received audio chunk of ${audioData.length} bytes`);
        
        // Send processing acknowledgment
        try {
            ws.send(JSON.stringify({
                type: 'processing',
                message: 'Processing audio...'
            }));
        } catch (err) {
            console.error('❌ Error sending processing message:', err);
            return;
        }
        
        // Check if OpenAI API key is available
        if (!OPENAI_API_KEY) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'OpenAI API key not configured',
                timestamp: Date.now()
            }));
            return;
        }
        
        try {
            const startTime = Date.now();
            const transcription = await transcribeAudio(audioData);
            const endTime = Date.now();
            const processingTime = (endTime - startTime) / 1000;
            
            if (transcription) {
                const response = {
                    type: 'transcription',
                    text: transcription,
                    processing_time: processingTime,
                    timestamp: Date.now()
                };
                console.log(`✅ Transcription: "${transcription}" (took ${processingTime}s)`);
                ws.send(JSON.stringify(response));
            } else {
                const response = {
                    type: 'error',
                    message: 'Could not transcribe audio',
                    timestamp: Date.now()
                };
                ws.send(JSON.stringify(response));
            }
        } catch (error) {
            console.error('❌ Error processing audio:', error.message);
            try {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to process audio',
                    timestamp: Date.now()
                }));
            } catch (sendErr) {
                console.error('❌ Error sending error message:', sendErr);
            }
        }
    });
    
    ws.on('close', () => {
        console.log('❌ WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// Function to transcribe audio using OpenAI Whisper API
async function transcribeAudio(audioData) {
    let tempFilePath = null;
    
    try {
        // Create temporary file
        const tempDir = require('os').tmpdir();
        tempFilePath = path.join(tempDir, `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`);
        
        // Write audio data to temporary file
        fs.writeFileSync(tempFilePath, audioData);
        console.log(`📁 Created temporary file: ${tempFilePath}, size: ${audioData.length} bytes`);
        
        // Prepare form data for OpenAI API
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath), {
            filename: 'audio.webm',
            contentType: 'audio/webm'
        });
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'json');
        formData.append('language', 'en');
        
        // Make request to OpenAI API
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                ...formData.getHeaders()
            },
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        if (response.status === 200 && response.data.text) {
            const transcription = response.data.text.trim();
            console.log(`🎯 OpenAI API success: "${transcription}"`);
            return transcription;
        } else {
            console.error('❌ OpenAI API error: No text in response');
            return null;
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ OpenAI API error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Error transcribing audio:', error.message);
        }
        return null;
    } finally {
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
                console.log(`🗑️ Cleaned up temporary file: ${tempFilePath}`);
            } catch (cleanupError) {
                console.error('❌ Error cleaning up temporary file:', cleanupError.message);
            }
        }
    }
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Speech Transcription Service running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 WebSocket endpoint: ws://0.0.0.0:${PORT}/ws/transcribe`);
    console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
});

// Error handling
server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
}); 