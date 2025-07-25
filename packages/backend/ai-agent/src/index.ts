import mongoose from 'mongoose';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { Order } from '@agentic-pos/shared';

dotenv.config();

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
  await mongoose.connect(process.env.MONGO_URI!);
  const comprehend = new AWS.Comprehend({ region: process.env.AWS_REGION });
  
  setInterval(async () => {
    const orders = await OrderModel.find({ status: 'pending' });
    for (const order of orders) {
      // parse via Comprehend, generate TTS with Rime, update order.status='paid'
      order.status = 'paid';
      await order.save();
    }
  }, 5000);
};

main().catch(console.error); 