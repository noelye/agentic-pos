import express from 'express';
import { PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (go up 3 levels from packages/backend/payments)
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

const app = express();
app.use(express.json());

// Add CORS configuration
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

const solanaRpcUrl = process.env.SOLANA_RPC_URL;
if (!solanaRpcUrl) {
  console.warn('Warning: SOLANA_RPC_URL not found in environment variables');
}

const conn = new Connection(solanaRpcUrl || 'https://api.devnet.solana.com');

app.post('/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    console.log('💰 Creating payment for order:', orderId, 'Amount:', amount);
    
    // generate Solana payment link as QR URI...
    res.json({ 
      orderId, 
      uri: `solana:${new PublicKey(SystemProgram.programId).toBase58()}?amount=${amount}` 
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

const PORT = process.env.PAYMENTS_PORT || 4001;
app.listen(PORT, () => console.log(`🚀 Payments service on ${PORT}`)); 