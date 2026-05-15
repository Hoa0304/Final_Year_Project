import api from '../config/api';
import { Transaction } from './user.service';

export interface CategorizedTransaction extends Transaction {
  category?: string;
  is_manual_label?: boolean;
}

export interface TransactionCategory {
  [category: string]: {
    count: number;
    totalAmount: number;
  };
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  transaction: CategorizedTransaction;
}

export async function getCategorizedTransactions(category?: string, limit = 50, offset = 0): Promise<CategorizedTransaction[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  try {
    const response = await api.get<{ transactions: CategorizedTransaction[] }>(
      `/transactions?${params.toString()}`
    );
    console.log(`📊 Fetched ${response.data.transactions?.length || 0} transactions`);
    return response.data.transactions || [];
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

export async function updateTransactionLabel(
  transactionId: string,
  category: string
): Promise<CategorizedTransaction> {
  const response = await api.put<{ transaction: CategorizedTransaction; message: string }>(
    `/transactions/${transactionId}/label`,
    { category }
  );
  return response.data.transaction;
}

export async function categorizeTransaction(transactionId: string): Promise<CategorizationResult> {
  const response = await api.post<CategorizationResult>(
    `/transactions/${transactionId}/categorize`
  );
  return response.data;
}

export async function getTransactionCategories(): Promise<TransactionCategory> {
  const response = await api.get<{ categories: TransactionCategory }>('/transactions/categories');
  return response.data.categories;
}

export interface ExpenseStatistics {
  period: string;
  summary: {
    totalSpending: number;
    totalEarnings: number;
    netAmount: number;
    transactionCount: number;
  };
  categoryBreakdown: {
    [category: string]: {
      amount: number;
      count: number;
      transactions: Array<{
        id: string;
        amount: number;
        description: string;
        date: string;
      }>;
    };
  };
  topCategories: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    amount: number;
  }>;
}

export async function getExpenseStatistics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ExpenseStatistics> {
  const params = new URLSearchParams();
  params.append('period', period);
  
  const response = await api.get<ExpenseStatistics>(`/transactions/expense-statistics?${params.toString()}`);
  return response.data;
}

export interface ExpenseInsight {
  type: 'warning' | 'suggestion' | 'alert' | 'insight' | 'tip';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionType?: 'save' | 'reduce' | 'diversify' | 'budget' | 'earn';
  category?: string;
  amount?: number;
  confidence: number;
}

export interface ExpenseInsightsResponse {
  insights: ExpenseInsight[];
  prediction: {
    predictedAmount: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  source: string;
}

export async function getExpenseInsights(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ExpenseInsightsResponse> {
  const params = new URLSearchParams();
  params.append('period', period);
  
  const response = await api.get<ExpenseInsightsResponse>(`/transactions/expense-insights?${params.toString()}`);
  return response.data;
}

