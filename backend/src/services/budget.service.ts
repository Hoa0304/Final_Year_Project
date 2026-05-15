import { supabase } from '../utils/supabase';

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

/**
 * Create or update user budget
 */
export async function upsertUserBudget(
  userId: string,
  budgetType: 'monthly' | 'weekly' | 'daily',
  amount: number,
  periodStart: Date,
  periodEnd: Date
): Promise<UserBudget> {
  const { data, error } = await supabase
    .from('user_budgets')
    .upsert({
      user_id: userId,
      budget_type: budgetType,
      amount,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,budget_type,period_start',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert budget: ${error.message}`);
  }

  return data;
}

/**
 * Get user's active budgets
 */
export async function getUserBudgets(userId: string): Promise<UserBudget[]> {
  const { data, error } = await supabase
    .from('user_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch budgets: ${error.message}`);
  }

  return data || [];
}

/**
 * Get current period budget
 */
export async function getCurrentBudget(
  userId: string,
  budgetType: 'monthly' | 'weekly' | 'daily'
): Promise<UserBudget | null> {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (budgetType) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
  }

  const { data, error } = await supabase
    .from('user_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('budget_type', budgetType)
    .eq('is_active', true)
    .gte('period_end', startDate.toISOString().split('T')[0])
    .lte('period_start', endDate.toISOString().split('T')[0])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch current budget: ${error.message}`);
  }

  return data || null;
}

/**
 * Create or update category budget
 */
export async function upsertCategoryBudget(
  userId: string,
  category: string,
  amount: number,
  periodType: 'monthly' | 'weekly' | 'daily',
  periodStart: Date,
  periodEnd: Date
): Promise<CategoryBudget> {
  const { data, error } = await supabase
    .from('category_budgets')
    .upsert({
      user_id: userId,
      category,
      amount,
      period_type: periodType,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,category,period_type,period_start',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert category budget: ${error.message}`);
  }

  return data;
}

/**
 * Get category budgets
 */
export async function getCategoryBudgets(userId: string): Promise<CategoryBudget[]> {
  const { data, error } = await supabase
    .from('category_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch category budgets: ${error.message}`);
  }

  return data || [];
}

/**
 * Create savings goal
 */
export async function createSavingsGoal(
  userId: string,
  title: string,
  targetAmount: number,
  description?: string,
  targetDate?: Date
): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: userId,
      title,
      description,
      target_amount: targetAmount,
      current_amount: 0,
      target_date: targetDate?.toISOString().split('T')[0],
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create savings goal: ${error.message}`);
  }

  return data;
}

/**
 * Get savings goals
 */
export async function getSavingsGoals(userId: string, includeCompleted = false): Promise<SavingsGoal[]> {
  let query = supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!includeCompleted) {
    query = query.eq('is_completed', false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch savings goals: ${error.message}`);
  }

  return data || [];
}

/**
 * Update savings goal progress
 */
export async function updateSavingsGoal(
  goalId: string,
  userId: string,
  updates: Partial<SavingsGoal>
): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update savings goal: ${error.message}`);
  }

  return data;
}

/**
 * Get budget alerts
 */
export async function getBudgetAlerts(userId: string, unreadOnly = false): Promise<BudgetAlert[]> {
  let query = supabase
    .from('budget_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch budget alerts: ${error.message}`);
  }

  return data || [];
}

/**
 * Mark budget alert as read
 */
export async function markBudgetAlertAsRead(alertId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('budget_alerts')
    .update({ is_read: true })
    .eq('id', alertId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to mark alert as read: ${error.message}`);
  }
}

/**
 * Calculate budget progress
 */
export async function getBudgetProgress(
  userId: string,
  budgetType: 'monthly' | 'weekly' | 'daily'
): Promise<{
  budget: UserBudget | null;
  spent: number;
  remaining: number;
  percentage: number;
}> {
  const budget = await getCurrentBudget(userId, budgetType);
  
  if (!budget) {
    return {
      budget: null,
      spent: 0,
      remaining: 0,
      percentage: 0,
    };
  }

  const startDate = new Date(budget.period_start);
  const endDate = new Date(budget.period_end);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .in('type', ['spend', 'revoke'])
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    throw new Error(`Failed to calculate budget progress: ${error.message}`);
  }

  const spent = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
  const remaining = Math.max(0, parseFloat(budget.amount.toString()) - spent);
  const percentage = (spent / parseFloat(budget.amount.toString())) * 100;

  return {
    budget,
    spent,
    remaining,
    percentage,
  };
}















