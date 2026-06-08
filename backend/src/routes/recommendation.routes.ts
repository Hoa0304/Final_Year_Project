import express from 'express';
import { getSpendingRecommendations, getMLRecommendations } from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.get('/spending', getSpendingRecommendations);
router.get('/ml', getMLRecommendations); // ML-based product recommendations

export default router;


