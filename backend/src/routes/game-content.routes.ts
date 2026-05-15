import express from 'express';
import {
  getGameContent,
  addGameContent,
  updateGameContent,
  deleteGameContent,
  reorderGameContent,
} from '../controllers/game-content.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/:gameInstanceId', getGameContent);
router.post('/:gameInstanceId', addGameContent);
router.put('/:gameInstanceId/:contentId', updateGameContent);
router.delete('/:gameInstanceId/:contentId', deleteGameContent);
router.post('/:gameInstanceId/reorder', reorderGameContent);

export default router;







