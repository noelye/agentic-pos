import { Router } from 'express';
import { OrderModel } from '../models/order';

const router = Router();

// Create a new order
router.post('/', async (req, res) => {
  try {
    const order = await OrderModel.create({ 
      ...req.body, 
      status: 'pending', 
      createdAt: new Date().toISOString() 
    });
    console.log('📝 Order created:', order._id);
    res.status(201).json(order);
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await OrderModel.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get a specific order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

export default router; 