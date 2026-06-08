import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getVendorOrders,
  updateOrderStatus,
  getAllOrders,
  getOrderAnalytics,
  mockVndPayment,
} from '../controllers/order.controller';

const router = express.Router();

// Client routes
router.post('/', authenticate, createOrder);
router.get('/my', authenticate, getMyOrders);
router.get('/analytics', authenticate, getOrderAnalytics);
router.get('/:id', authenticate, getOrderById);

// Vendor routes
router.get('/vendor/list', authenticate, getVendorOrders);
router.put('/:id/status', authenticate, updateOrderStatus);

// Admin routes
router.get('/', authenticate, requireAdmin, getAllOrders);

// Dev-only: mock VND payment
router.post('/mock-vnd-payment', authenticate, mockVndPayment);

export default router;
