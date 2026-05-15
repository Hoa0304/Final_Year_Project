import api from '../config/api';

export interface UserBudget {
  id: string;
  user_id: string;
  budget_type: 'monthly' | 'weekly' | 'daily';
  amount: number;
  period_start: string;
  period_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryBudget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  period_type: 'monthly' | 'weekly' | 'daily';
  period_start: string;
  period_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetAlert {
  id: string;
  user_id: string;
  budget_id?: string;
  budget_type: 'overall' | 'category';
  alert_type: 'warning' | 'exceeded';
  threshold_percentage: number;
  is_read: boolean;
  created_at: string;
}

export interface BudgetProgress {
  budget: UserBudget | null;
  spent: number;
  remaining: number;
  percentage: number;
}

/**
 * Set user budget
 */
export async function setUserBudget(
  budgetType: 'monthly' | 'weekly' | 'daily',
  amount: number,
  periodStart?: string,
  periodEnd?: string
): Promise<{ budget: UserBudget }> {
  const response = await api.post<{ budget: UserBudget }>('/budgets', {
    budgetType,
    amount,
    periodStart,
    periodEnd,
  });
  return response.data;
}

/**
 * Get user budgets
 */
export async function getUserBudgets(): Promise<{ budgets: UserBudget[] }> {
  const response = await api.get<{ budgets: UserBudget[] }>('/budgets');
  return response.data;
}

/**
 * Get current budget progress
 */
export async function getBudgetProgress(
  budgetType: 'monthly' | 'weekly' | 'daily' = 'monthly'
): Promise<BudgetProgress> {
  const params = new URLSearchParams();
  params.append('budgetType', budgetType);
  
  const response = await api.get<BudgetProgress>(`/budgets/progress?${params.toString()}`);
  return response.data;
}

/**
 * Set category budget
 */
export async function setCategoryBudget(
  category: string,
  amount: number,
  periodType: 'monthly' | 'weekly' | 'daily' = 'monthly',
  periodStart?: string,
  periodEnd?: string
): Promise<{ budget: CategoryBudget }> {
  const response = await api.post<{ budget: CategoryBudget }>('/budgets/category', {
    category,
    amount,
    periodType,
    periodStart,
    periodEnd,
  });
  return response.data;
}

/**
 * Get category budgets
 */
export async function getCategoryBudgets(): Promise<{ budgets: CategoryBudget[] }> {
  const response = await api.get<{ budgets: CategoryBudget[] }>('/budgets/category');
  return response.data;
}

/**
 * Create savings goal
 */
export async function createSavingsGoal(
  title: string,
  targetAmount: number,
  description?: string,
  targetDate?: string
): Promise<{ goal: SavingsGoal }> {
  const response = await api.post<{ goal: SavingsGoal }>('/budgets/savings-goals', {
    title,
    targetAmount,
    description,
    targetDate,
  });
  return response.data;
}

/**
 * Get savings goals
 */
export async function getSavingsGoals(includeCompleted = false): Promise<{ goals: SavingsGoal[] }> {
  const params = new URLSearchParams();
  params.append('includeCompleted', includeCompleted.toString());
  
  const response = await api.get<{ goals: SavingsGoal[] }>(`/budgets/savings-goals?${params.toString()}`);
  return response.data;
}

/**
 * Update savings goal
 */
export async function updateSavingsGoal(
  goalId: string,
  updates: Partial<SavingsGoal>
): Promise<{ goal: SavingsGoal }> {
  const response = await api.put<{ goal: SavingsGoal }>(`/budgets/savings-goals/${goalId}`, updates);
  return response.data;
}

/**
 * Get budget alerts
 */
export async function getBudgetAlerts(unreadOnly = false): Promise<{ alerts: BudgetAlert[] }> {
  const params = new URLSearchParams();
  params.append('unreadOnly', unreadOnly.toString());
  
  const response = await api.get<{ alerts: BudgetAlert[] }>(`/budgets/alerts?${params.toString()}`);
  return response.data;
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(alertId: string): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>(`/budgets/alerts/${alertId}/read`);
  return response.data;
}















