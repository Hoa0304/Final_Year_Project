import express from 'express';
import { 
  getAllUsers, 
  getUserStats, 
  grantCoins, 
  getAllTransactions 
} from '../controllers/admin.controller';
import { authenticate, requireAdminClient } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);
router.use(requireAdminClient);

// User Management
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.post('/users/:id/coins', grantCoins);

// Finance Management
router.get('/transactions', getAllTransactions);

// Client Features (To be expanded: Game management, Banner management)
// router.get('/games', getGames);
// router.post('/banners', createBanner);

export default router;
