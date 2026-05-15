import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  setUserBudget,
  getUserBudgetsHandler,
  getCurrentBudgetProgress,
  setCategoryBudget,
  getCategoryBudgetsHandler,
  createSavingsGoalHandler,
  getSavingsGoalsHandler,
  updateSavingsGoalHandler,
  getBudgetAlertsHandler,
  markAlertAsReadHandler,
} from '../controllers/budget.controller';

const router = express.Router();

// User budgets
router.post('/', authenticate, setUserBudget);
router.get('/', authenticate, getUserBudgetsHandler);
router.get('/progress', authenticate, getCurrentBudgetProgress);

// Category budgets
router.post('/category', authenticate, setCategoryBudget);
router.get('/category', authenticate, getCategoryBudgetsHandler);

// Savings goals
router.post('/savings-goals', authenticate, createSavingsGoalHandler);
router.get('/savings-goals', authenticate, getSavingsGoalsHandler);
router.put('/savings-goals/:goalId', authenticate, updateSavingsGoalHandler);

// Budget alerts
router.get('/alerts', authenticate, getBudgetAlertsHandler);
router.put('/alerts/:alertId/read', authenticate, markAlertAsReadHandler);

export default router;















