import { Schema, model } from 'mongoose';
import { Order } from '@agentic-pos/shared';
const schema = new Schema<Order>({ items: [{ menuItemId: String, quantity: Number }], dietaryNotes: String, language: String, status: String, createdAt: String });
export const OrderModel = model<Order>('Order', schema); 