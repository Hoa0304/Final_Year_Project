import express from 'express';
import {
  getGames,
  getGameById,
  getUserGameStats,
  checkCanPlay,
  playTicTacToe,
  submitGameResult
} from '../controllers/game.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/', getGames);
router.get('/:id', getGameById);

// Authenticated routes
router.get('/stats/me', authenticate, getUserGameStats);
router.get('/:gameId/can-play', authenticate, checkCanPlay);
router.post('/tictactoe/play', authenticate, playTicTacToe);
router.post('/submit', authenticate, submitGameResult);

export default router;


