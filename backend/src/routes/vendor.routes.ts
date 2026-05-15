import express from 'express';
import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductDiscount
} from '../controllers/vendor.controller';
import { authenticate, requireVendor } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate); // All routes require authentication
router.use(requireVendor); // All routes require vendor or admin role

router.get('/products', getMyProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.put('/products/:id/discount', setProductDiscount);

export default router;

