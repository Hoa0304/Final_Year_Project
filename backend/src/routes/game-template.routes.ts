import express from 'express';
import {
  getGameTemplates,
  getGameTemplateById,
  createGameTemplate,
  updateGameTemplate,
  deleteGameTemplate,
} from '../controllers/game-template.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/', getGameTemplates);
router.get('/:id', getGameTemplateById);

// Admin only routes
router.post('/', authenticate, requireAdmin, createGameTemplate);
router.put('/:id', authenticate, requireAdmin, updateGameTemplate);
router.delete('/:id', authenticate, requireAdmin, deleteGameTemplate);

export default router;







