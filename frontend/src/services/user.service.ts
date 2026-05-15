import api from '../config/api';

export interface BalanceResponse {
  balance: number;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
}

/**
 * Get user's current balance
 */
export async function getBalance(): Promise<number> {
  const response = await api.get<BalanceResponse>('/users/balance');
  return response.data.balance;
}

/**
 * Get user's transaction history
 */
export async function getTransactions(limit = 50, offset = 0): Promise<Transaction[]> {
  const response = await api.get<TransactionsResponse>('/users/transactions', {
    params: { limit, offset },
  });
  return response.data.transactions;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  balance: number;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  address?: string;
  dateOfBirth?: string;
}

export interface ProfileResponse {
  user: UserProfile;
}

/**
 * Get user profile
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await api.get<ProfileResponse>('/users/profile');
  return response.data.user;
}

/**
 * Update user profile
 */
export async function updateProfile(data: {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  address?: string;
  dateOfBirth?: string;
}): Promise<UserProfile> {
  const response = await api.put<ProfileResponse>('/users/profile', data);
  return response.data.user;
}


