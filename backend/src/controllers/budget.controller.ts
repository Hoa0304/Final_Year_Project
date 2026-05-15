import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  upsertUserBudget,
  getUserBudgets,
  getCurrentBudget,
  upsertCategoryBudget,
  getCategoryBudgets,
  createSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  getBudgetAlerts,
  markBudgetAlertAsRead,
  getBudgetProgress,
} from '../services/budget.service';

/**
 * Create or update user budget
 */
export async function setUserBudget(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { budgetType, amount, periodStart, periodEnd } = req.body;

    if (!budgetType || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid budget data' });
    }

    const startDate = periodStart ? new Date(periodStart) : new Date();
    const endDate = periodEnd ? new Date(periodEnd) : new Date();

    const budget = await upsertUserBudget(userId, budgetType, amount, startDate, endDate);

    res.json({ budget });
  } catch (error: any) {
    console.error('Set user budget error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get user budgets
 */
export async function getUserBudgetsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const budgets = await getUserBudgets(userId);
    res.json({ budgets });
  } catch (error: any) {
    console.error('Get user budgets error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get current budget with progress
 */
export async function getCurrentBudgetProgress(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { budgetType = 'monthly' } = req.query;

    const progress = await getBudgetProgress(userId, budgetType as 'monthly' | 'weekly' | 'daily');
    res.json(progress);
  } catch (error: any) {
    console.error('Get budget progress error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Set category budget
 */
export async function setCategoryBudget(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { category, amount, periodType, periodStart, periodEnd } = req.body;

    if (!category || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid category budget data' });
    }

    const startDate = periodStart ? new Date(periodStart) : new Date();
    const endDate = periodEnd ? new Date(periodEnd) : new Date();
    const period = periodType || 'monthly';

    const budget = await upsertCategoryBudget(userId, category, amount, period, startDate, endDate);

    res.json({ budget });
  } catch (error: any) {
    console.error('Set category budget error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get category budgets
 */
export async function getCategoryBudgetsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const budgets = await getCategoryBudgets(userId);
    res.json({ budgets });
  } catch (error: any) {
    console.error('Get category budgets error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Create savings goal
 */
export async function createSavingsGoalHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { title, targetAmount, description, targetDate } = req.body;

    if (!title || !targetAmount || targetAmount <= 0) {
      return res.status(400).json({ error: 'Invalid savings goal data' });
    }

    const goal = await createSavingsGoal(
      userId,
      title,
      targetAmount,
      description,
      targetDate ? new Date(targetDate) : undefined
    );

    res.json({ goal });
  } catch (error: any) {
    console.error('Create savings goal error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get savings goals
 */
export async function getSavingsGoalsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { includeCompleted } = req.query;
    const goals = await getSavingsGoals(userId, includeCompleted === 'true');
    res.json({ goals });
  } catch (error: any) {
    console.error('Get savings goals error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Update savings goal
 */
export async function updateSavingsGoalHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { goalId } = req.params;
    const updates = req.body;

    const goal = await updateSavingsGoal(goalId, userId, updates);
    res.json({ goal });
  } catch (error: any) {
    console.error('Update savings goal error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get budget alerts
 */
export async function getBudgetAlertsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { unreadOnly } = req.query;
    const alerts = await getBudgetAlerts(userId, unreadOnly === 'true');
    res.json({ alerts });
  } catch (error: any) {
    console.error('Get budget alerts error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Mark alert as read
 */
export async function markAlertAsReadHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { alertId } = req.params;

    await markBudgetAlertAsRead(alertId, userId);
    res.json({ message: 'Alert marked as read' });
  } catch (error: any) {
    console.error('Mark alert as read error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}















