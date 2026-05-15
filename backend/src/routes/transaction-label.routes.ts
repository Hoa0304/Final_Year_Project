import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCategorizedTransactions,
  updateTransactionLabel,
  categorizeTransaction,
  getTransactionCategories,
  getLabelBasedSuggestions,
  getExpenseStatistics,
  getExpenseInsights
} from '../controllers/transaction-label.controller';

const router = express.Router();

router.get('/', authenticate, getCategorizedTransactions);
router.get('/categories', authenticate, getTransactionCategories);
router.get('/suggestions', authenticate, getLabelBasedSuggestions);
router.get('/expense-statistics', authenticate, getExpenseStatistics);
router.get('/expense-insights', authenticate, getExpenseInsights);
router.put('/:transactionId/label', authenticate, updateTransactionLabel);
router.post('/:transactionId/categorize', authenticate, categorizeTransaction);

export default router;

