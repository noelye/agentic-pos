import express from 'express';
import { PublicKey, Connection, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import WebSocket from 'ws';
import QRCode from 'qrcode';

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
  solAmount: number;
  expectedSignature?: string;
  timestamp: number;
}>();

// WebSocket connection for real-time monitoring
let paymentWS: WebSocket | null = null;
let wsReconnectAttempts = 0;
const maxReconnectAttempts = 10;

// SOL price cache
let solPriceUSD = 0;
let lastPriceUpdate = 0;
const PRICE_CACHE_DURATION = 60000; // 1 minute

// Get current SOL price in USD
async function getSolPrice(): Promise<number> {
  try {
    const now = Date.now();
    if (solPriceUSD > 0 && (now - lastPriceUpdate) < PRICE_CACHE_DURATION) {
      return solPriceUSD;
    }

    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    solPriceUSD = response.data.solana.usd;
    lastPriceUpdate = now;
    
    console.log(`💰 SOL price updated: $${solPriceUSD}`);
    return solPriceUSD;
  } catch (error) {
    console.error('❌ Error fetching SOL price:', error);
    // Fallback to cached price or default
    return solPriceUSD > 0 ? solPriceUSD : 100; // Default fallback price
  }
}

// Convert USD to SOL amount
async function convertUsdToSol(usdAmount: number): Promise<number> {
  const solPrice = await getSolPrice();
  return usdAmount / solPrice;
}

app.post('/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    console.log('💰 Creating payment for order:', orderId, 'Amount: $', amount);
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Convert USD to SOL
    const solAmount = await convertUsdToSol(amount);
    const roundedSolAmount = Math.round(solAmount * 1000000) / 1000000; // Round to 6 decimal places

    console.log(`💰 USD: $${amount} = ${roundedSolAmount} SOL`);

    // Create payment tracking
    const paymentId = crypto.randomUUID();
    pendingPayments.set(paymentId, {
      orderId,
      amount,
      solAmount: roundedSolAmount,
      timestamp: Date.now()
    });

    // Generate Solana payment URI with exact SOL amount
    const paymentUri = `solana:${merchantPublicKey}?amount=${roundedSolAmount}&label=Agentic%20POS%20Order%20${orderId}&message=Payment%20for%20order%20${orderId}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(paymentUri);
    
    res.json({ 
      orderId,
      paymentId,
      merchantWallet: merchantPublicKey,
      uri: paymentUri,
      qrCode,
      amount,
      solAmount: roundedSolAmount,
      solPrice: await getSolPrice()
    });

    // Start monitoring for this payment
    if (heliusApiKey) {
      setupWebSocketMonitoring();
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
        amount: pendingPayment.amount,
        solAmount: pendingPayment.solAmount,
        solPrice: await getSolPrice(),
        merchantWallet: merchantPublicKey
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

// Setup WebSocket monitoring using Helius Enhanced WebSockets
function setupWebSocketMonitoring() {
  if (!heliusApiKey) {
    console.log('⚠️  Skipping WebSocket monitoring - no Helius API key');
    return;
  }

  if (paymentWS && paymentWS.readyState === WebSocket.OPEN) {
    console.log('🔍 WebSocket already connected and monitoring');
    return;
  }

  const wsUrl = `wss://atlas-devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  console.log('🔍 Connecting to Helius Enhanced WebSocket...');

  paymentWS = new WebSocket(wsUrl);

  paymentWS.on('open', () => {
    console.log('🔗 WebSocket connected successfully');
    wsReconnectAttempts = 0;

    // Subscribe to account changes for our merchant wallet
    const subscribeMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'accountSubscribe',
      params: [
        merchantPublicKey,
        {
          encoding: 'jsonParsed',
          commitment: 'confirmed'
        }
      ]
    };

    paymentWS!.send(JSON.stringify(subscribeMessage));
    console.log(`🔍 Subscribed to account changes for ${merchantPublicKey}`);

    // Setup ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (paymentWS && paymentWS.readyState === WebSocket.OPEN) {
        paymentWS.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: Date.now()
        }));
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
  });

  paymentWS.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.method === 'accountNotification') {
        console.log('💰 Account balance changed, checking for payments...');
        await checkRecentTransactions();
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  });

  paymentWS.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  paymentWS.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    
    // Attempt to reconnect with exponential backoff
    if (wsReconnectAttempts < maxReconnectAttempts) {
      wsReconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
      console.log(`🔄 Reconnecting WebSocket in ${delay}ms (attempt ${wsReconnectAttempts}/${maxReconnectAttempts})`);
      
      setTimeout(() => {
        setupWebSocketMonitoring();
      }, delay);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached');
    }
  });
}

// Check recent transactions when account balance changes
async function checkRecentTransactions() {
  try {
    // Get recent transactions for our merchant wallet
    const response = await axios.get(
      `https://api.helius.xyz/v0/addresses/${merchantPublicKey}/transactions?api-key=${heliusApiKey}&limit=10`
    );

    const transactions = response.data;
    
    for (const tx of transactions) {
      // Check if this is a relevant payment transaction
      if (tx.type === 'TRANSFER' && tx.tokenTransfers) {
        for (const transfer of tx.tokenTransfers) {
          if (transfer.toUserAccount === merchantPublicKey) {
            const receivedAmount = transfer.tokenAmount;
            console.log(`💰 Received payment: ${receivedAmount} SOL, Signature: ${tx.signature}`);
            
            // Check if this matches any pending payments
            await checkPaymentMatch(receivedAmount, tx.signature);
          }
        }
      }
      
      // Also check native SOL transfers
      if (tx.nativeTransfers) {
        for (const transfer of tx.nativeTransfers) {
          if (transfer.toUserAccount === merchantPublicKey) {
            const receivedAmount = transfer.amount / 1000000000; // Convert lamports to SOL
            console.log(`💰 Received SOL payment: ${receivedAmount} SOL, Signature: ${tx.signature}`);
            
            await checkPaymentMatch(receivedAmount, tx.signature);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking recent transactions:', error);
  }
}

// Check if received amount matches any pending payment
async function checkPaymentMatch(receivedAmount: number, signature: string) {
  const tolerance = 0.000001; // 0.000001 SOL tolerance for rounding differences
  
  for (const [paymentId, payment] of pendingPayments.entries()) {
    const expectedAmount = payment.solAmount;
    const difference = Math.abs(receivedAmount - expectedAmount);
    
    if (difference <= tolerance) {
      console.log(`✅ Payment confirmed! Order: ${payment.orderId}, Expected: ${expectedAmount} SOL, Received: ${receivedAmount} SOL`);
      console.log(`📝 Transaction signature: ${signature}`);
      
      // Update order status to paid
      await updateOrderStatus(payment.orderId, 'paid', signature);
      
      // Remove from pending payments
      pendingPayments.delete(paymentId);
      return;
    }
  }
  
  console.log(`⚠️  Received payment ${receivedAmount} SOL but no matching pending order found`);
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