/**
 * Upload routes for file management
 */
import express from 'express';
import { uploadFile, deleteFile, deleteFileByUrl } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload file
router.post('/', uploadSingle, uploadFile);

// Delete file by public ID
router.delete('/:publicId', deleteFile);

// Delete file by URL
router.delete('/by-url', deleteFileByUrl);

export default router;






















