import express from 'express';
import { PublicKey, Connection, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';

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

const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const heliusApiKey = process.env.HELIUS_API_KEY;

if (!heliusApiKey) {
  console.warn('⚠️  Warning: HELIUS_API_KEY not found - transaction monitoring will be limited');
}

const conn = new Connection(solanaRpcUrl);

// Load merchant wallet address from environment or generate for development
let merchantPublicKey: string;

const envMerchantWallet = process.env.MERCHANT_WALLET_ADDRESS;

if (envMerchantWallet && envMerchantWallet !== 'your_merchant_wallet_address_here') {
  try {
    // Validate the public key
    new PublicKey(envMerchantWallet);
    merchantPublicKey = envMerchantWallet;
    console.log('🏪 Using merchant wallet from .env:', merchantPublicKey);
  } catch (error) {
    console.error('❌ Invalid merchant wallet address in .env:', error);
    console.log('🔄 Falling back to generated wallet...');
    const tempWallet = Keypair.generate();
    merchantPublicKey = tempWallet.publicKey.toBase58();
    console.log('⚠️  Generated temporary wallet:', merchantPublicKey);
  }
} else {
  // Development mode - generate a temporary wallet
  const tempWallet = Keypair.generate();
  merchantPublicKey = tempWallet.publicKey.toBase58();
  console.log('🏪 Generated development wallet:', merchantPublicKey);
  console.log('💡 To use your real wallet, set MERCHANT_WALLET_ADDRESS in your .env file');
}

// Store for tracking pending payments
const pendingPayments = new Map<string, {
  orderId: string;
  amount: number;
  expectedSignature?: string;
  timestamp: number;
}>();

app.post('/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    console.log('💰 Creating payment for order:', orderId, 'Amount:', amount);
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Create payment tracking
    const paymentId = crypto.randomUUID();
    pendingPayments.set(paymentId, {
      orderId,
      amount,
      timestamp: Date.now()
    });

    // Generate Solana payment URI with real merchant wallet
    const paymentUri = `solana:${merchantPublicKey}?amount=${amount}&label=Agentic%20POS%20Order%20${orderId}&message=Payment%20for%20order%20${orderId}`;
    
    res.json({ 
      orderId,
      paymentId,
      merchantWallet: merchantPublicKey,
      uri: paymentUri,
      amount
    });

    // Start monitoring for this payment
    if (heliusApiKey) {
      monitorPayment(orderId, amount, merchantPublicKey);
    }
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Get payment status
app.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if payment is pending
    const pendingPayment = Array.from(pendingPayments.values())
      .find(payment => payment.orderId === orderId);
    
    if (pendingPayment) {
      res.json({ 
        orderId,
        status: 'pending',
        amount: pendingPayment.amount
      });
    } else {
      res.json({ 
        orderId,
        status: 'unknown'
      });
    }
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Monitor payment using Helius API
async function monitorPayment(orderId: string, expectedAmount: number, walletAddress: string) {
  if (!heliusApiKey) {
    console.log('⚠️  Skipping payment monitoring - no Helius API key');
    return;
  }

  console.log(`🔍 Starting payment monitoring for order ${orderId}`);

  // Poll for transactions (in production, use webhooks)
  const pollInterval = setInterval(async () => {
    try {
      // Use Helius API to check for recent transactions
      const response = await axios.post(`https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${heliusApiKey}`, {
        limit: 10
      });

      const transactions = response.data;
      
      for (const tx of transactions) {
        // Check if transaction amount matches expected amount
        if (tx.type === 'TRANSFER' && tx.amount >= expectedAmount) {
          console.log(`✅ Payment confirmed for order ${orderId}! Signature: ${tx.signature}`);
          
          // Update order status to paid
          await updateOrderStatus(orderId, 'paid', tx.signature);
          
          // Remove from pending payments
          pendingPayments.forEach((payment, key) => {
            if (payment.orderId === orderId) {
              pendingPayments.delete(key);
            }
          });
          
          clearInterval(pollInterval);
          return;
        }
      }
    } catch (error) {
      console.error('❌ Error monitoring payment:', error);
    }
  }, 10000); // Check every 10 seconds

  // Stop monitoring after 30 minutes
  setTimeout(() => {
    clearInterval(pollInterval);
    console.log(`⏰ Payment monitoring timeout for order ${orderId}`);
  }, 30 * 60 * 1000);
}

// Update order status via API call to server
async function updateOrderStatus(orderId: string, status: string, transactionSignature?: string) {
  try {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:4000';
    
    await axios.patch(`${serverUrl}/orders/${orderId}`, {
      status,
      transactionSignature,
      paidAt: new Date().toISOString()
    });
    
    console.log(`📝 Updated order ${orderId} status to: ${status}`);
  } catch (error) {
    console.error('❌ Error updating order status:', error);
  }
}

const PORT = process.env.PAYMENTS_PORT || 4001;
app.listen(PORT, () => {
  console.log(`🚀 Payments service on ${PORT}`);
  console.log(`🏪 Merchant wallet: ${merchantPublicKey}`);
  console.log(`🔍 Helius monitoring: ${heliusApiKey ? 'Enabled' : 'Disabled'}`);
}); 