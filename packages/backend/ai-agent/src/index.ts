import mongoose from 'mongoose';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { Order } from '@agentic-pos/shared';

// Load .env from project root (3 levels up: ../../../.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Create our own OrderModel instead of importing from server
const orderSchema = new mongoose.Schema<Order>({ 
  items: [{ menuItemId: String, quantity: Number }], 
  dietaryNotes: String, 
  language: String, 
  status: String, 
  createdAt: String 
});
const OrderModel = mongoose.model<Order>('Order', orderSchema);

const main = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined. Check your .env file.');
    }
    
    await mongoose.connect(mongoUri);
    console.log('AI Agent connected to MongoDB');
    
    // Initialize AWS Comprehend (will warn if credentials missing)
    const awsRegion = process.env.AWS_REGION || 'us-west-2';
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('Warning: AWS credentials not found. AI features will be limited.');
    }
    
    const comprehend = new AWS.Comprehend({ region: awsRegion });
    console.log('AI Agent started - processing orders every 5 seconds');
    
    setInterval(async () => {
      try {
        const orders = await OrderModel.find({ status: 'pending' });
        for (const order of orders) {
          // parse via Comprehend, generate TTS with Rime, update order.status='paid'
          console.log(`Processing order ${order.id}`);
          order.status = 'paid';
          await order.save();
        }
      } catch (error) {
        console.error('Error processing orders:', error);
      }
    }, 5000);
  } catch (error) {
    console.error('Failed to start AI Agent:', error);
    process.exit(1);
  }
};

main().catch(console.error); 