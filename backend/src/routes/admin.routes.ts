import express from 'express';
import {
  grantCoins,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getAllUsers,
  getUserStats,
  getTaskCompletions,
  getAllTransactions,
  syncBalancesToBlockchainController
} from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate); // All routes require authentication
router.use(requireAdmin); // All routes require admin role

router.post('/users/:id/coins', grantCoins);
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.get('/transactions', getAllTransactions);
router.post('/blockchain/sync-balances', syncBalancesToBlockchainController);

router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/tasks', getTasks);
router.get('/tasks/:taskId/completions', getTaskCompletions);
router.post('/tasks', createTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

export default router;


