import express from 'express';
import { getProducts, getProductById, purchaseProduct, getCategories } from '../controllers/product.controller';
import {
  getProductRatings,
  submitRating,
  updateRating,
  deleteRating,
  getUserRating,
  getAllRatings,
} from '../controllers/rating.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Product routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.post('/purchase', authenticate, purchaseProduct);

// Rating routes (must be before /:id to avoid route conflicts)
router.get('/ratings/all', authenticate, getAllRatings); // For ML training
router.get('/:productId/ratings', getProductRatings);
router.get('/:productId/ratings/my', authenticate, getUserRating);
router.post('/:productId/ratings', authenticate, submitRating);
router.put('/:productId/ratings/:ratingId', authenticate, updateRating);
router.delete('/:productId/ratings/:ratingId', authenticate, deleteRating);

// Product detail route (must be last to avoid conflicts)
router.get('/:id', getProductById);

export default router;


