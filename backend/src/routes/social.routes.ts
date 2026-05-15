import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  createPost,
  updatePost,
  deletePost,
  toggleReaction,
  reportContent,
  pinThread,
  lockThread,
} from '../controllers/social.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Thread routes
router.get('/threads', getThreads);
router.get('/threads/:threadId', getThread);
router.post('/threads', createThread);
router.put('/threads/:threadId', updateThread);
router.delete('/threads/:threadId', deleteThread);

// Post/Comment routes
router.post('/posts', createPost);
router.put('/posts/:postId', updatePost);
router.delete('/posts/:postId', deletePost);

// Reaction routes
router.post('/reactions', toggleReaction);

// Report routes
router.post('/reports', reportContent);

// Moderation routes (admin/vendor only)
router.post('/threads/:threadId/pin', pinThread);
router.post('/threads/:threadId/lock', lockThread);

export default router;















