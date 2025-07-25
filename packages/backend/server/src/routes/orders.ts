import { Router } from 'express';
import { OrderModel } from '../models/order';
const router = Router();
router.post('/', async (req, res) => {
  const order = await OrderModel.create({ ...req.body, status: 'pending', createdAt: new Date().toISOString() });
  res.status(201).json(order);
});
export default router; 