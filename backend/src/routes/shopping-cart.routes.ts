import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/shopping-cart.controller';

const router = express.Router();

router.get('/', authenticate, getCart);
router.post('/', authenticate, addToCart);
router.put('/:itemId', authenticate, updateCartItem);
router.delete('/:itemId', authenticate, removeFromCart);
router.delete('/', authenticate, clearCart);

export default router;

























