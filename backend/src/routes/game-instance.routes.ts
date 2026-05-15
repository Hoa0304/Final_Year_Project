import express from 'express';
import {
  getGameInstances,
  getGameInstanceById,
  createGameInstance,
  updateGameInstance,
  deleteGameInstance,
  validateGameInstanceConfig,
} from '../controllers/game-instance.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// All routes under /api/admin/game-instances require admin access
// Admin routes - GET operations
router.get('/', authenticate, requireAdmin, getGameInstances);
router.get('/:id', authenticate, requireAdmin, getGameInstanceById);

// Admin routes - POST, PUT, DELETE operations
router.post('/', authenticate, requireAdmin, createGameInstance);
router.put('/:id', authenticate, requireAdmin, updateGameInstance);
router.delete('/:id', authenticate, requireAdmin, deleteGameInstance);
router.post('/validate', authenticate, requireAdmin, validateGameInstanceConfig);

export default router;







