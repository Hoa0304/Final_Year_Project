import express from 'express';
import {
  getStocks,
  getStockById,
  buyStock,
  sellStock,
  getPortfolio,
  getStockTransactions,
  getStockPriceHistory,
  getStockHolding
} from '../controllers/stock.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', getStocks);
router.get('/portfolio/me', authenticate, getPortfolio);
router.get('/transactions/me', authenticate, getStockTransactions);
router.get('/:id/holding', authenticate, getStockHolding);
router.get('/:id/history', getStockPriceHistory);
router.get('/:id', getStockById);
router.post('/buy', authenticate, buyStock);
router.post('/sell', authenticate, sellStock);

export default router;


