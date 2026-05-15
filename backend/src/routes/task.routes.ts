import express from 'express';
import { getTasks, getTaskById, completeTask } from '../controllers/task.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Use optionalAuthenticate to allow both authenticated and unauthenticated access
// Authenticated users will get validation and status, unauthenticated users get basic tasks
router.get('/', optionalAuthenticate, getTasks);
router.get('/:id', optionalAuthenticate, getTaskById);
router.post('/:id/complete', authenticate, completeTask);

export default router;


