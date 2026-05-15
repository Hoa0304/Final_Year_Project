import { supabase } from '../utils/supabase';
import {
  isBlockchainEnabled,
  generateUserAddress,
  getTokenBalance,
  getUserTransactionIds,
  getBlockchainTransaction,
  getContract,
  REGISTRY_ABI,
} from './blockchain.service';
import { config } from '../config/env';

/**
 * Blockchain Audit Service
 * Verifies integrity between database and blockchain
 * Detects any discrepancies or tampering
 */

export interface AuditResult {
  userId: string;
  userEmail: string;
  databaseBalance: number;
  blockchainBalance: number;
  match: boolean;
  discrepancy?: number;
  databaseTxCount: number;
  blockchainTxCount: number;
  txCountMatch: boolean;
  issues: string[];
}

export interface TransactionMismatch {
  transactionId: string;
  userId: string;
  userEmail: string;
  databaseTx: any;
  blockchainTxId?: number;
  issue: string;
}

/**
 * Audit a single user's balance and transactions
 * Compares database vs blockchain
 */
export async function auditUser(userId: string): Promise<AuditResult> {
  const issues: string[] = [];
  
  // Get user from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, virtual_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  const databaseBalance = parseFloat(user.virtual_balance.toString());

  // Get database transactions count
  const { count: databaseTxCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get blockchain data if enabled
  let blockchainBalance = 0;
  let blockchainTxCount = 0;
  let balanceMatch = true;
  let txCountMatch = true;

  if (isBlockchainEnabled()) {
    try {
      const userAddress = generateUserAddress(userId);
      blockchainBalance = await getTokenBalance(userAddress);
      const blockchainTxIds = await getUserTransactionIds(userAddress);
      blockchainTxCount = blockchainTxIds.length;

      // Check balance match
      const balanceDiff = Math.abs(databaseBalance - blockchainBalance);
      if (balanceDiff > 0.01) { // Allow small floating point differences
        balanceMatch = false;
        issues.push(`Balance mismatch: DB=${databaseBalance}, BC=${blockchainBalance}, Diff=${balanceDiff.toFixed(2)}`);
      }

      // Check transaction count match
      if (databaseTxCount !== blockchainTxCount) {
        txCountMatch = false;
        issues.push(`Transaction count mismatch: DB=${databaseTxCount}, BC=${blockchainTxCount}`);
      }
    } catch (error: any) {
      issues.push(`Blockchain error: ${error.message}`);
    }
  } else {
    issues.push('Blockchain not enabled - cannot verify');
  }

  return {
    userId: user.id,
    userEmail: user.email || 'N/A',
    databaseBalance,
    blockchainBalance,
    match: balanceMatch && txCountMatch,
    discrepancy: balanceMatch ? undefined : Math.abs(databaseBalance - blockchainBalance),
    databaseTxCount: databaseTxCount || 0,
    blockchainTxCount,
    txCountMatch,
    issues,
  };
}

/**
 * Audit all users (admin only)
 * Returns list of users with mismatches
 */
export async function auditAllUsers(): Promise<{
  totalUsers: number;
  auditedUsers: number;
  matchedUsers: number;
  mismatchedUsers: number;
  results: AuditResult[];
}> {
  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name');

  if (error) {
    throw new Error('Failed to fetch users');
  }

  const totalUsers = users?.length || 0;
  const results: AuditResult[] = [];
  let matchedUsers = 0;
  let mismatchedUsers = 0;

  // Audit each user
  for (const user of users || []) {
    try {
      const auditResult = await auditUser(user.id);
      results.push(auditResult);
      
      if (auditResult.match) {
        matchedUsers++;
      } else {
        mismatchedUsers++;
      }
    } catch (error: any) {
      results.push({
        userId: user.id,
        userEmail: user.email || 'N/A',
        databaseBalance: 0,
        blockchainBalance: 0,
        match: false,
        databaseTxCount: 0,
        blockchainTxCount: 0,
        txCountMatch: false,
        issues: [`Audit failed: ${error.message}`],
      });
      mismatchedUsers++;
    }
  }

  return {
    totalUsers,
    auditedUsers: results.length,
    matchedUsers,
    mismatchedUsers,
    results,
  };
}

/**
 * Find transactions that exist in database but not on blockchain
 * This detects potential tampering
 */
export async function findUnrecordedTransactions(userId?: string): Promise<TransactionMismatch[]> {
  const mismatches: TransactionMismatch[] = [];

  // Get transactions from database
  let query = supabase
    .from('transactions')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1000); // Check last 1000 transactions

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: transactions, error } = await query;

  if (error || !transactions) {
    throw new Error('Failed to fetch transactions');
  }

  if (!isBlockchainEnabled()) {
    return mismatches;
  }

  // For each transaction, check if it exists on blockchain
  for (const tx of transactions) {
    try {
      const userAddress = generateUserAddress(tx.user_id);
      const blockchainTxIds = await getUserTransactionIds(userAddress);

      // Try to find matching transaction on blockchain
      // We'll check by comparing amounts and timestamps
      let found = false;
      
      for (const txId of blockchainTxIds) {
        try {
          const blockchainTx = await getBlockchainTransaction(txId);
          
          // Match by amount and approximate timestamp (within 5 minutes)
          const amountMatch = Math.abs(blockchainTx.amount - parseFloat(tx.amount.toString())) < 0.01;
          const timeMatch = Math.abs(
            blockchainTx.timestamp - new Date(tx.created_at).getTime() / 1000
          ) < 300; // 5 minutes

          if (amountMatch && timeMatch) {
            found = true;
            break;
          }
        } catch (error) {
          // Transaction doesn't exist on blockchain
          continue;
        }
      }

      if (!found) {
        mismatches.push({
          transactionId: tx.id,
          userId: tx.user_id,
          userEmail: tx.user?.email || 'N/A',
          databaseTx: tx,
          issue: 'Transaction exists in database but not found on blockchain',
        });
      }
    } catch (error: any) {
      mismatches.push({
        transactionId: tx.id,
        userId: tx.user_id,
        userEmail: tx.user?.email || 'N/A',
        databaseTx: tx,
        issue: `Error checking blockchain: ${error.message}`,
      });
    }
  }

  return mismatches;
}

/**
 * Verify a specific transaction exists on blockchain
 */
export async function verifyTransactionOnBlockchain(
  transactionId: string,
  userId: string
): Promise<{
  exists: boolean;
  blockchainTxId?: number;
  match: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Get transaction from database
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error || !tx) {
    throw new Error('Transaction not found in database');
  }

  if (!isBlockchainEnabled()) {
    return {
      exists: false,
      match: false,
      issues: ['Blockchain not enabled'],
    };
  }

  // Check blockchain
  const userAddress = generateUserAddress(userId);
  const blockchainTxIds = await getUserTransactionIds(userAddress);

  let found = false;
  let blockchainTxId: number | undefined;
  let match = false;

  for (const txId of blockchainTxIds) {
    try {
      const blockchainTx = await getBlockchainTransaction(txId);
      
      // Match by amount and approximate timestamp
      const amountMatch = Math.abs(blockchainTx.amount - parseFloat(tx.amount.toString())) < 0.01;
      const timeMatch = Math.abs(
        blockchainTx.timestamp - new Date(tx.created_at).getTime() / 1000
      ) < 300; // 5 minutes

      if (amountMatch && timeMatch) {
        found = true;
        blockchainTxId = txId;
        
        // Verify all fields match
        const typeMatch = blockchainTx.transactionType === tx.type;
        const balanceBeforeMatch = Math.abs(
          blockchainTx.balanceBefore - parseFloat(tx.balance_before.toString())
        ) < 0.01;
        const balanceAfterMatch = Math.abs(
          blockchainTx.balanceAfter - parseFloat(tx.balance_after.toString())
        ) < 0.01;

        match = typeMatch && balanceBeforeMatch && balanceAfterMatch;

        if (!typeMatch) issues.push('Transaction type mismatch');
        if (!balanceBeforeMatch) issues.push('Balance before mismatch');
        if (!balanceAfterMatch) issues.push('Balance after mismatch');
        
        break;
      }
    } catch (error) {
      continue;
    }
  }

  if (!found) {
    issues.push('Transaction not found on blockchain');
  }

  return {
    exists: found,
    blockchainTxId,
    match,
    issues,
  };
}

