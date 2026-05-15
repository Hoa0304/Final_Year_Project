import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  isBlockchainEnabled,
  generateUserAddress,
  getTokenBalance,
  getBlockchainTransaction,
  getUserTransactionIds,
  getAllBlockchainTransactions,
  verifyTransactionOnBlockchain,
  verifyUserBalance,
} from '../services/blockchain.service';
import { supabase } from '../utils/supabase';

/**
 * Get blockchain status
 */
export async function getBlockchainStatus(req: Request, res: Response) {
  try {
    const enabled = isBlockchainEnabled();
    res.json({
      enabled,
      message: enabled
        ? 'Blockchain is enabled and configured'
        : 'Blockchain is not configured. Add blockchain config to .env to enable.',
    });
  } catch (error: any) {
    console.error('Get blockchain status error:', error);
    res.status(500).json({ error: 'Failed to get blockchain status' });
  }
}

/**
 * Get user's blockchain address
 */
export async function getUserBlockchainAddress(req: AuthRequest, res: Response) {
  try {
    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: 'Blockchain is not enabled' });
    }

    const userId = req.user!.userId;
    const address = generateUserAddress(userId);

    res.json({
      userId,
      address,
      message: 'Blockchain address generated from user ID',
    });
  } catch (error: any) {
    console.error('Get user blockchain address error:', error);
    res.status(500).json({ error: 'Failed to get blockchain address' });
  }
}

/**
 * Get user's token balance on blockchain
 */
export async function getUserTokenBalance(req: AuthRequest, res: Response) {
  try {
    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: 'Blockchain is not enabled' });
    }

    const userId = req.user!.userId;
    const address = generateUserAddress(userId);
    const balance = await getTokenBalance(address);

    res.json({
      userId,
      address,
      balance,
      message: 'Token balance retrieved from blockchain',
    });
  } catch (error: any) {
    console.error('Get token balance error:', error);
    res.status(500).json({ error: `Failed to get token balance: ${error.message}` });
  }
}

/**
 * Get blockchain transaction by ID
 */
export async function getBlockchainTransactionById(req: Request, res: Response) {
  try {
    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: 'Blockchain is not enabled' });
    }

    const { txId } = req.params;
    const txIdNumber = parseInt(txId, 10);

    if (isNaN(txIdNumber)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const transaction = await getBlockchainTransaction(txIdNumber);

    res.json({
      transaction,
      message: 'Transaction retrieved from blockchain',
    });
  } catch (error: any) {
    console.error('Get blockchain transaction error:', error);
    res.status(500).json({ error: `Failed to get transaction: ${error.message}` });
  }
}

/**
 * Get user's blockchain transaction IDs
 */
export async function getUserBlockchainTransactions(req: AuthRequest, res: Response) {
  try {
    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: 'Blockchain is not enabled' });
    }

    const userId = req.user!.userId;
    const address = generateUserAddress(userId);
    const txIds = await getUserTransactionIds(address);

    res.json({
      userId,
      address,
      transactionIds: txIds.map((id) => Number(id)),
      count: txIds.length,
      message: 'User transaction IDs retrieved from blockchain',
    });
  } catch (error: any) {
    console.error('Get user blockchain transactions error:', error);
    res.status(500).json({ error: `Failed to get transactions: ${error.message}` });
  }
}

/**
 * Get all blockchain transactions (admin only)
 */
export async function getAllBlockchainTransactionsController(req: AuthRequest, res: Response) {
  try {
    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: 'Blockchain is not enabled' });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await getAllBlockchainTransactions(limit, offset);

    // Try to enrich with user info from database
    const enrichedTransactions = await Promise.all(
      result.transactions.map(async (tx) => {
        try {
          // Try to find user by blockchain address
          // Since we use deterministic addresses, we need to check all users
          // For now, we'll just return the address
          // In production, you might want to maintain a mapping table
          return {
            ...tx,
            userInfo: null, // Could be enriched with user lookup
          };
        } catch (error) {
          return tx;
        }
      })
    );

    res.json({
      transactions: enrichedTransactions,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: 'All blockchain transactions retrieved',
    });
  } catch (error: any) {
    console.error('Get all blockchain transactions error:', error);
    res.status(500).json({ error: `Failed to get transactions: ${error.message}` });
  }
}

/**
 * Verify transaction on blockchain
 */
export async function verifyTransaction(req: AuthRequest, res: Response) {
  try {
    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: 'Blockchain is not enabled' });
    }

    const { txId } = req.body;
    if (!txId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const txIdNumber = parseInt(txId, 10);
    if (isNaN(txIdNumber)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const exists = await verifyTransactionOnBlockchain(txIdNumber);
    
    if (exists) {
      const transaction = await getBlockchainTransaction(txIdNumber);
      res.json({
        verified: true,
        transaction,
        message: 'Transaction verified on blockchain',
      });
    } else {
      res.json({
        verified: false,
        message: 'Transaction not found on blockchain',
      });
    }
  } catch (error: any) {
    console.error('Verify transaction error:', error);
    res.status(500).json({ error: `Failed to verify transaction: ${error.message}` });
  }
}

/**
 * Verify user balance
 */
export async function verifyUserBalanceController(req: AuthRequest, res: Response) {
  try {
    if (!isBlockchainEnabled()) {
      return res.status(400).json({ error: 'Blockchain is not enabled' });
    }

    const userId = req.user!.userId;

    // Get database balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const verification = await verifyUserBalance(userId, user.virtual_balance);

    res.json({
      ...verification,
      databaseBalance: user.virtual_balance,
      message: verification.match
        ? 'Balance matches blockchain'
        : 'Balance mismatch detected',
    });
  } catch (error: any) {
    console.error('Verify user balance error:', error);
    res.status(500).json({ error: `Failed to verify balance: ${error.message}` });
  }
}


