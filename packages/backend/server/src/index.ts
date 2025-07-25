import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import orderRoutes from './routes/orders';
import menuRoutes from './routes/menu';

// Load .env from project root (go up 3 levels from packages/backend/server)
const envPath = path.resolve(process.cwd(), '../../../.env');
console.log('🔍 Looking for .env file at:', envPath);
dotenv.config({ path: envPath });

const app = express();
app.use(express.json());

// Fix CORS for multiple origins
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback for development
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use('/orders', orderRoutes);
app.use('/menu', menuRoutes);

const httpServer = http.createServer(app);
const io = new IOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});
io.on('connection', sock => console.log('🔌 WebSocket connected'));

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      throw new Error('MONGO_URI environment variable is not defined. Check your .env file.');
    }
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const port = process.env.SERVER_PORT || 4000;
    httpServer.listen(port, () => console.log(`🚀 Server running on port ${port}`));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 