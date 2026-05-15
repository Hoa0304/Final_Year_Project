import express from 'express';
import { getSpendingRecommendations, getInvestingRecommendations, getMLRecommendations } from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.get('/spending', getSpendingRecommendations);
router.get('/investing', getInvestingRecommendations);
router.get('/ml', getMLRecommendations); // ML-based product recommendations

export default router;


