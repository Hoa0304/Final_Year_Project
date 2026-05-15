import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getItemSuggestions } from '../controllers/ai-suggestions.controller';

const router = express.Router();

router.get('/items', authenticate, getItemSuggestions);

export default router;

























