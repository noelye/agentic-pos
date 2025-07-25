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
let monitoringStartTime = 0;

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
    monitoringStartTime = Date.now();

    // Subscribe to transactions that mention our merchant wallet
    const subscribeMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'transactionSubscribe',
      params: [
        {
          failed: false,
          accountInclude: [merchantPublicKey]
        },
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
          transactionDetails: 'full',
          maxSupportedTransactionVersion: 0
        }
      ]
    };

    paymentWS!.send(JSON.stringify(subscribeMessage));
    console.log(`🔍 Subscribed to transactions for ${merchantPublicKey} (monitoring started at ${new Date(monitoringStartTime).toISOString()})`);

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
      
      if (message.method === 'transactionNotification') {
        const transactionData = message.params.result;
        const signature = transactionData.signature;
        const timestamp = transactionData.transaction.blockTime || (Date.now() / 1000);
        
        // Only process transactions that happened after monitoring started
        if (timestamp * 1000 >= monitoringStartTime) {
          console.log(`🔔 New transaction detected: ${signature}`);
          console.log(`📅 Transaction time: ${new Date(timestamp * 1000).toISOString()}`);
          console.log(`🕐 Monitoring started: ${new Date(monitoringStartTime).toISOString()}`);
          
          await analyzeSpecificTransaction(transactionData);
        } else {
          console.log(`⏰ Skipping old transaction: ${signature} (before monitoring started)`);
        }
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

// Analyze a specific transaction received via WebSocket
async function analyzeSpecificTransaction(transactionData: any) {
  try {
    const signature = transactionData.signature;
    console.log(`🔍 Analyzing transaction: ${signature}`);
    console.log(`📋 Current pending payments: ${pendingPayments.size}`);
    
    // List pending payments for debugging
    for (const [paymentId, payment] of pendingPayments.entries()) {
      console.log(`   - Order ${payment.orderId}: $${payment.amount} = ${payment.solAmount} SOL (Payment ID: ${paymentId})`);
    }

    // Check if transaction has native transfers
    if (transactionData.transaction && transactionData.transaction.meta && transactionData.transaction.meta.postBalances) {
      // Extract account keys and balance changes
      const accountKeys = transactionData.transaction.transaction.message.accountKeys;
      const preBalances = transactionData.transaction.meta.preBalances;
      const postBalances = transactionData.transaction.meta.postBalances;
      
      // Find our merchant wallet in the account keys
      let merchantIndex = -1;
      for (let i = 0; i < accountKeys.length; i++) {
        if (accountKeys[i].pubkey === merchantPublicKey) {
          merchantIndex = i;
          break;
        }
      }
      
      if (merchantIndex !== -1) {
        const preBalance = preBalances[merchantIndex];
        const postBalance = postBalances[merchantIndex];
        const balanceChange = postBalance - preBalance;
        
        if (balanceChange > 0) {
          const receivedAmount = balanceChange / 1000000000; // Convert lamports to SOL
          console.log(`💰 Received SOL payment: ${receivedAmount} SOL (${balanceChange} lamports), Signature: ${signature}`);
          
          await checkPaymentMatch(receivedAmount, signature);
        } else if (balanceChange < 0) {
          console.log(`📤 SOL sent out: ${Math.abs(balanceChange / 1000000000)} SOL, Signature: ${signature}`);
        } else {
          console.log(`🔄 No balance change for merchant wallet, Signature: ${signature}`);
        }
      } else {
        console.log(`⚠️  Merchant wallet not found in transaction accounts, Signature: ${signature}`);
      }
    } else {
      console.log(`⚠️  Transaction missing balance data, Signature: ${signature}`);
    }
  } catch (error: any) {
    console.error('❌ Error analyzing transaction:', error);
    console.error('Transaction data:', JSON.stringify(transactionData, null, 2));
  }
}

// Check recent transactions when account balance changes (legacy - kept for fallback)
async function checkRecentTransactions() {
  try {
    console.log(`🔍 Checking recent transactions for ${merchantPublicKey}...`);
    console.log(`📋 Current pending payments: ${pendingPayments.size}`);
    
    // List pending payments for debugging
    for (const [paymentId, payment] of pendingPayments.entries()) {
      console.log(`   - Order ${payment.orderId}: $${payment.amount} = ${payment.solAmount} SOL (Payment ID: ${paymentId})`);
    }

    // Get recent transactions for our merchant wallet
    const response = await axios.get(
      `https://api.helius.xyz/v0/addresses/${merchantPublicKey}/transactions?api-key=${heliusApiKey}&limit=20`
    );

    const transactions = response.data;
    console.log(`📊 Found ${transactions.length} recent transactions`);
    
    for (const tx of transactions) {
      console.log(`\n🔍 Processing transaction: ${tx.signature}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Description: ${tx.description || 'N/A'}`);
      
      // Debug: Log the full transaction structure for the first transaction
      if (transactions.indexOf(tx) === 0) {
        console.log('📋 Sample transaction structure:', JSON.stringify(tx, null, 2));
      }
      
      // Check if this is a relevant payment transaction
      if (tx.type === 'TRANSFER' && tx.tokenTransfers) {
        console.log(`   Token transfers found: ${tx.tokenTransfers.length}`);
        for (const transfer of tx.tokenTransfers) {
          if (transfer.toUserAccount === merchantPublicKey) {
            const receivedAmount = transfer.tokenAmount;
            console.log(`💰 Received token payment: ${receivedAmount} tokens, Signature: ${tx.signature}`);
            
            // Check if this matches any pending payments
            await checkPaymentMatch(receivedAmount, tx.signature);
          }
        }
      }
      
      // Also check native SOL transfers
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        console.log(`   Native transfers found: ${tx.nativeTransfers.length}`);
        for (const transfer of tx.nativeTransfers) {
          console.log(`   Transfer: ${transfer.fromUserAccount} → ${transfer.toUserAccount}: ${transfer.amount} lamports`);
          if (transfer.toUserAccount === merchantPublicKey) {
            const receivedAmount = transfer.amount / 1000000000; // Convert lamports to SOL
            console.log(`💰 Received SOL payment: ${receivedAmount} SOL (${transfer.amount} lamports), Signature: ${tx.signature}`);
            
            await checkPaymentMatch(receivedAmount, tx.signature);
          }
        }
      } else {
        console.log(`   No native transfers found`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error checking recent transactions:', error);
    console.error('Full error:', error.response?.data || error.message);
  }
}

// Check if received amount matches any pending payment
async function checkPaymentMatch(receivedAmount: number, signature: string) {
  const tolerance = 0.000001; // 0.000001 SOL tolerance for rounding differences
  
  console.log(`🔍 Checking payment match for ${receivedAmount} SOL...`);
  console.log(`📋 Pending payments to check: ${pendingPayments.size}`);
  
  for (const [paymentId, payment] of pendingPayments.entries()) {
    const expectedAmount = payment.solAmount;
    const difference = Math.abs(receivedAmount - expectedAmount);
    
    console.log(`   🔍 Comparing: Expected ${expectedAmount} SOL vs Received ${receivedAmount} SOL (diff: ${difference})`);
    
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
  
  if (pendingPayments.size === 0) {
    console.log(`⚠️  Received payment ${receivedAmount} SOL but no pending orders in system`);
  } else {
    console.log(`⚠️  Received payment ${receivedAmount} SOL but no matching pending order found (tolerance: ${tolerance} SOL)`);
  }
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