import express from 'express';
import { 
  createPayment, 
  vnpayWebhook, 
  momoWebhook,
  getCoinPackages,
  getVendorPackages 
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { getEthVndRate } from '../services/eth-rate.service';

const router = express.Router();

// Public / Authenticated routes
router.get('/packages', getCoinPackages);
router.get('/vendor-packages', getVendorPackages);
router.post('/create', authenticate, createPayment);

// ETH/VND exchange rate (public)
router.get('/eth-rate', async (req, res) => {
  try {
    const rate = await getEthVndRate();
    res.json({ rate: rate.ethVnd, source: rate.source, updatedAt: rate.updatedAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rate' });
  }
});

// Webhooks (Public, verification handled by provider logic)
router.get('/vnpay-webhook', vnpayWebhook);
router.post('/momo-webhook', momoWebhook);

export default router;
