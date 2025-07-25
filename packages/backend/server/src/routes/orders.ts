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
    console.log('📝 Order created:', order.id);
    
    // Emit to management console via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('order:created', order);
      console.log('📡 Emitted order:created event to management console');
    }
    
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

// Update order status (for payment confirmations)
router.patch('/:id', async (req, res) => {
  try {
    const { status, transactionSignature, paidAt } = req.body;
    
    const order = await OrderModel.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(transactionSignature && { transactionSignature }),
        ...(paidAt && { paidAt })
      },
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log(`📝 Order ${order.id} status updated to: ${status}`);
    if (transactionSignature) {
      console.log(`💰 Transaction signature: ${transactionSignature}`);
    }
    
    // Emit Socket.IO events based on status change
    const io = req.app.get('io');
    if (io) {
      // Always emit to management console
      io.emit('order:updated', order);
      console.log('📡 Emitted order:updated event to management console');
      
      // If order was just paid, emit to kitchen display
      if (status === 'paid') {
        io.emit('order:paid', order);
        console.log('🍳 Emitted order:paid event to kitchen display');
      }
      
      // If order was completed, could emit to analytics, etc.
      if (status === 'completed') {
        io.emit('order:completed', order);
        console.log('✅ Emitted order:completed event');
      }
    }
    
    res.json(order);
  } catch (error) {
    console.error('❌ Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router; 