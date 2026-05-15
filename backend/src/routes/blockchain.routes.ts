import { Router } from 'express';
import {
  getBlockchainStatus,
  getUserBlockchainAddress,
  getUserTokenBalance,
  getBlockchainTransactionById,
  getUserBlockchainTransactions,
  getAllBlockchainTransactionsController,
  verifyTransaction,
  verifyUserBalanceController,
} from '../controllers/blockchain.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/blockchain/status
 * Get blockchain status (public)
 */
router.get('/status', getBlockchainStatus);

/**
 * GET /api/blockchain/address
 * Get user's blockchain address (authenticated)
 */
router.get('/address', authenticate, getUserBlockchainAddress);

/**
 * GET /api/blockchain/balance
 * Get user's token balance on blockchain (authenticated)
 */
router.get('/balance', authenticate, getUserTokenBalance);

/**
 * GET /api/blockchain/transactions
 * Get user's blockchain transaction IDs (authenticated)
 */
router.get('/transactions', authenticate, getUserBlockchainTransactions);

/**
 * GET /api/blockchain/transactions/:txId
 * Get blockchain transaction by ID (public, for verification)
 */
router.get('/transactions/:txId', getBlockchainTransactionById);

/**
 * POST /api/blockchain/verify
 * Verify transaction on blockchain (authenticated)
 */
router.post('/verify', authenticate, verifyTransaction);

/**
 * GET /api/blockchain/verify-balance
 * Verify user balance matches blockchain (authenticated)
 */
router.get('/verify-balance', authenticate, verifyUserBalanceController);

/**
 * GET /api/blockchain/admin/all
 * Get all blockchain transactions (admin only)
 */
router.get('/admin/all', authenticate, getAllBlockchainTransactionsController);

export default router;


