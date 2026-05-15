import api from '../config/api';

/**
 * Blockchain Service
 * Handles blockchain-related API calls
 */

export interface BlockchainStatus {
  enabled: boolean;
  message: string;
}

export interface BlockchainAddress {
  userId: string;
  address: string;
  message: string;
}

export interface TokenBalance {
  userId: string;
  address: string;
  balance: number;
  message: string;
}

export interface BlockchainTransaction {
  id: number;
  user: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId: string;
  referenceType: string;
  createdBy: string;
  timestamp: number;
}

export interface UserBlockchainTransactions {
  userId: string;
  address: string;
  transactionIds: number[];
  count: number;
  message: string;
}

/**
 * Get blockchain status
 */
export async function getBlockchainStatus(): Promise<BlockchainStatus> {
  const response = await api.get('/blockchain/status');
  return response.data;
}

/**
 * Get user's blockchain address
 */
export async function getUserBlockchainAddress(): Promise<BlockchainAddress> {
  const response = await api.get('/blockchain/address');
  return response.data;
}

/**
 * Get user's token balance on blockchain
 */
export async function getUserTokenBalance(): Promise<TokenBalance> {
  const response = await api.get('/blockchain/balance');
  return response.data;
}

/**
 * Get user's blockchain transaction IDs
 */
export async function getUserBlockchainTransactions(): Promise<UserBlockchainTransactions> {
  const response = await api.get('/blockchain/transactions');
  return response.data;
}

/**
 * Get blockchain transaction by ID
 */
export async function getBlockchainTransaction(txId: number): Promise<{ transaction: BlockchainTransaction }> {
  const response = await api.get(`/blockchain/transactions/${txId}`);
  return response.data;
}

export interface VerifyTransactionResponse {
  verified: boolean;
  transaction?: BlockchainTransaction;
  message: string;
}

export interface VerifyBalanceResponse {
  match: boolean;
  databaseBalance: number;
  blockchainBalance: number;
  discrepancy?: number;
  message: string;
}

/**
 * Verify transaction on blockchain
 */
export async function verifyTransactionOnBlockchain(txId: number): Promise<VerifyTransactionResponse> {
  const response = await api.post('/blockchain/verify', { txId });
  return response.data;
}

/**
 * Verify user balance matches blockchain
 */
export async function verifyUserBalance(): Promise<VerifyBalanceResponse> {
  const response = await api.get('/blockchain/verify-balance');
  return response.data;
}

