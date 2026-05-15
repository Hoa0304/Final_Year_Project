import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  auditUser,
  auditAllUsers,
  findUnrecordedTransactions,
  verifyTransactionOnBlockchain,
} from '../services/blockchain-audit.service';

/**
 * Audit a specific user (admin only)
 * GET /api/admin/blockchain-audit/user/:userId
 */
export async function auditUserController(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;

    const result = await auditUser(userId);

    res.json({
      success: result.match,
      audit: result,
      message: result.match
        ? 'User data matches blockchain'
        : '⚠️ Mismatch detected between database and blockchain',
    });
  } catch (error: any) {
    console.error('Audit user error:', error);
    res.status(500).json({ error: `Failed to audit user: ${error.message}` });
  }
}

/**
 * Audit all users (admin only)
 * GET /api/admin/blockchain-audit/all
 */
export async function auditAllUsersController(req: AuthRequest, res: Response) {
  try {
    const result = await auditAllUsers();

    res.json({
      success: result.mismatchedUsers === 0,
      ...result,
      message:
        result.mismatchedUsers === 0
          ? '✅ All users match blockchain'
          : `⚠️ ${result.mismatchedUsers} user(s) have mismatches`,
    });
  } catch (error: any) {
    console.error('Audit all users error:', error);
    res.status(500).json({ error: `Failed to audit users: ${error.message}` });
  }
}

/**
 * Find unrecorded transactions (admin only)
 * GET /api/admin/blockchain-audit/unrecorded?userId=xxx
 */
export async function findUnrecordedTransactionsController(req: AuthRequest, res: Response) {
  try {
    const userId = req.query.userId as string | undefined;

    const mismatches = await findUnrecordedTransactions(userId);

    res.json({
      count: mismatches.length,
      mismatches,
      message:
        mismatches.length === 0
          ? '✅ All transactions are recorded on blockchain'
          : `⚠️ ${mismatches.length} transaction(s) not found on blockchain`,
    });
  } catch (error: any) {
    console.error('Find unrecorded transactions error:', error);
    res.status(500).json({ error: `Failed to find unrecorded transactions: ${error.message}` });
  }
}

/**
 * Verify a specific transaction (admin only)
 * GET /api/admin/blockchain-audit/verify/:transactionId
 */
export async function verifyTransactionController(req: AuthRequest, res: Response) {
  try {
    const { transactionId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const result = await verifyTransactionOnBlockchain(transactionId, userId);

    res.json({
      success: result.exists && result.match,
      verification: result,
      message: result.exists && result.match
        ? '✅ Transaction verified on blockchain'
        : result.exists
        ? '⚠️ Transaction found but data mismatch'
        : '❌ Transaction not found on blockchain',
    });
  } catch (error: any) {
    console.error('Verify transaction error:', error);
    res.status(500).json({ error: `Failed to verify transaction: ${error.message}` });
  }
}





