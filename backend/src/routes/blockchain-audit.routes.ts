import { Router } from 'express';
import {
  auditUserController,
  auditAllUsersController,
  findUnrecordedTransactionsController,
  verifyTransactionController,
} from '../controllers/blockchain-audit.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/blockchain-audit/user/:userId
 * Audit a specific user
 */
router.get('/user/:userId', auditUserController);

/**
 * GET /api/admin/blockchain-audit/all
 * Audit all users
 */
router.get('/all', auditAllUsersController);

/**
 * GET /api/admin/blockchain-audit/unrecorded?userId=xxx
 * Find transactions not recorded on blockchain
 */
router.get('/unrecorded', findUnrecordedTransactionsController);

/**
 * GET /api/admin/blockchain-audit/verify/:transactionId?userId=xxx
 * Verify a specific transaction
 */
router.get('/verify/:transactionId', verifyTransactionController);

export default router;





