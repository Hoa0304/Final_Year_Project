import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getConversations,
  getConversation,
  createConversation,
  sendMessage,
  deleteConversation,
  updateConversationTitle,
} from '../controllers/chat.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Conversation routes
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId', getConversation);
router.post('/conversations', createConversation);
router.put('/conversations/:conversationId/title', updateConversationTitle);
router.delete('/conversations/:conversationId', deleteConversation);

// Message routes
router.post('/messages', sendMessage);

export default router;















