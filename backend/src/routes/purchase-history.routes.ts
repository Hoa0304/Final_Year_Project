import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPurchaseHistory, getAllPurchaseHistory } from '../controllers/purchase-history.controller';

const router = express.Router();

router.get('/', authenticate, getPurchaseHistory);
router.get('/all', authenticate, getAllPurchaseHistory); // For ML training

export default router;











