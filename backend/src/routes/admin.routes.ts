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
  approveProduct
} from '../controllers/admin.controller';
import { getPendingProducts, reviewProduct } from '../controllers/moderation.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate); // All routes require authentication

// User Management
router.post('/users/:id/coins', requireAdmin, grantCoins);
router.get('/users', requireAdmin, getAllUsers);
router.get('/users/stats', requireAdmin, getUserStats);
router.get('/transactions', requireAdmin, getAllTransactions);

// Product Management
router.get('/products', requireAdmin, getProducts);
router.post('/products', requireAdmin, createProduct);
router.put('/products/:id', requireAdmin, updateProduct);
router.delete('/products/:id', requireAdmin, deleteProduct);
router.patch('/products/:id/approve', requireAdmin, approveProduct);

// Product Moderation
router.get('/moderation/pending', requireAdmin, getPendingProducts);
router.post('/moderation/review/:id', requireAdmin, reviewProduct);

// Task Management
router.get('/tasks', requireAdmin, getTasks);
router.get('/tasks/:taskId/completions', requireAdmin, getTaskCompletions);
router.post('/tasks', requireAdmin, createTask);
router.put('/tasks/:id', requireAdmin, updateTask);
router.delete('/tasks/:id', requireAdmin, deleteTask);

export default router;



