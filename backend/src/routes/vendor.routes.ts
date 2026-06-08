import express from 'express';
import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductDiscount,
  getVendorAnalytics,
  getAdminVendorStats,
} from '../controllers/vendor.controller';
import {
  getVendorOrders,
  updateOrderStatus,
  getOrderAnalytics,
} from '../controllers/order.controller';
import { authenticate, requireVendor, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate); // All routes require authentication

// Vendor analytics dashboard
router.get('/analytics', requireVendor, getVendorAnalytics);

// Vendor order management
router.get('/orders', requireVendor, getVendorOrders);
router.put('/orders/:id/status', requireVendor, updateOrderStatus);
router.get('/orders/analytics', requireVendor, getOrderAnalytics);

// Product management (vendor only)
router.get('/products', requireVendor, getMyProducts);
router.post('/products', requireVendor, createProduct);
router.put('/products/:id', requireVendor, updateProduct);
router.delete('/products/:id', requireVendor, deleteProduct);
router.put('/products/:id/discount', requireVendor, setProductDiscount);

// Admin: all vendors stats
router.get('/admin/vendor-stats', requireAdmin, getAdminVendorStats);

export default router;
