import express from 'express';
import { PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const conn = new Connection(process.env.SOLANA_RPC_URL!);

app.post('/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
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

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Payments on ${PORT}`)); 