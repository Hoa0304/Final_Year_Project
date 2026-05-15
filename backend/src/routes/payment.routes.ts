import express from 'express';
import { 
  createPayment, 
  vnpayWebhook, 
  getCoinPackages,
  getVendorPackages 
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Public / Authenticated routes
router.get('/packages', getCoinPackages);
router.get('/vendor-packages', getVendorPackages);
router.post('/create', authenticate, createPayment);

// Webhooks (Public, verification handled by provider logic)
router.get('/vnpay-webhook', vnpayWebhook);

export default router;
