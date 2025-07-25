import { Schema, model } from 'mongoose';
import { Order } from '@agentic-pos/shared';

const orderSchema = new Schema<Order>({
  items: [{ 
    menuItemId: String, 
    quantity: Number,
    specialInstructions: String
  }],
  dietaryNotes: String,
  language: String,
  status: { type: String, default: 'pending' },
  createdAt: String,
  totalAmount: Number,
  customerName: String,
  orderType: { type: String, default: 'dine-in' },
  transactionSignature: String,
  paidAt: String
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const OrderModel = model<Order>('Order', orderSchema); 