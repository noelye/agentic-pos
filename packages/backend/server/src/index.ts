import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import orderRoutes from './routes/orders';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/orders', orderRoutes);

const httpServer = http.createServer(app);
const io = new IOServer(httpServer);
io.on('connection', sock => console.log('WS connected'));

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');
    
    httpServer.listen(4000, () => console.log('Server on 4000'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 