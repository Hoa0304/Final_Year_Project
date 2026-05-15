import express from 'express';
import {
  getVendorInfo,
  getVendorVouchersHandler,
  searchVendors,
  getVendorsByIds
} from '../controllers/vendor-public.controller';

const router = express.Router();

// Public routes - no authentication required
router.get('/search', searchVendors);
router.get('/by-ids', getVendorsByIds);
router.get('/:id', getVendorInfo);
router.get('/:id/vouchers', getVendorVouchersHandler);

export default router;

