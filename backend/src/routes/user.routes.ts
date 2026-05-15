import express from 'express';
import { getBalance, getTransactions, getProfile, updateProfile } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;


