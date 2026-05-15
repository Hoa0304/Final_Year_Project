import express from 'express';
import { authenticate, requireAdmin, requireAdminOrVendor } from '../middleware/auth.middleware';
import {
  createVoucherHandler,
  getVouchersHandler,
  getVoucherByIdHandler,
  getVoucherByCodeHandler,
  getAvailableVouchersHandler,
  getFeaturedVouchersHandler,
  updateVoucherHandler,
  deleteVoucherHandler,
  issueVoucherToUserHandler,
  claimVoucherHandler,
  redeemVoucherHandler,
  getUserVoucherRedemptionsHandler,
  getMyIssuedVouchersHandler,
  getVoucherStatsHandler
} from '../controllers/voucher.controller';

const router = express.Router();

// Public routes (anyone can view active vouchers)
router.get('/', getVouchersHandler);
router.get('/available', getAvailableVouchersHandler); // Get claimable vouchers
router.get('/featured', getFeaturedVouchersHandler); // Get featured vouchers for public page
router.get('/code/:code', getVoucherByCodeHandler);
router.get('/:id', getVoucherByIdHandler);

// Authenticated user routes
router.post('/claim', authenticate, claimVoucherHandler); // User claims a voucher
router.post('/redeem', authenticate, redeemVoucherHandler);
router.get('/my/redemptions', authenticate, getUserVoucherRedemptionsHandler);
router.get('/my/issued', authenticate, getMyIssuedVouchersHandler);

// Admin and Vendor routes (create, update, delete vouchers)
router.post('/', authenticate, requireAdminOrVendor, createVoucherHandler);
router.put('/:id', authenticate, requireAdminOrVendor, updateVoucherHandler);
router.delete('/:id', authenticate, requireAdminOrVendor, deleteVoucherHandler);

// Admin and Vendor routes (issue vouchers, view stats)
router.post('/issue', authenticate, requireAdminOrVendor, issueVoucherToUserHandler);
router.get('/:id/stats', authenticate, requireAdmin, getVoucherStatsHandler);

export default router;

