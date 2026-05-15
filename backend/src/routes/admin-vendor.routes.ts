import express from 'express';
import { getPendingProducts, reviewProduct } from '../controllers/moderation.controller';
import { authenticate, requireAdminVendor } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);
router.use(requireAdminVendor);

// Moderation
router.get('/moderation/pending', getPendingProducts);
router.post('/moderation/review/:id', reviewProduct);

// Vendor Management (To be expanded)
// router.get('/vendors', getAllVendors);
// router.post('/vendors/:id/verify', verifyVendor);

export default router;
