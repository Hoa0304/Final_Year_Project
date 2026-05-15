import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as messagingController from '../controllers/messaging.controller';

const router = Router();

// Get or create direct conversation
router.post('/conversations/get-or-create', authenticate, messagingController.getOrCreateConversation);

// Get all conversations for current user
router.get('/conversations', authenticate, messagingController.getConversations);

// Get specific conversation
router.get('/conversations/:id', authenticate, messagingController.getConversation);

// Get messages in a conversation
router.get('/conversations/:id/messages', authenticate, messagingController.getMessages);

// Send a message
router.post('/messages', authenticate, messagingController.sendMessage);

// Mark messages as read
router.post('/conversations/:id/read', authenticate, messagingController.markAsRead);

// Delete a message
router.delete('/messages/:id', authenticate, messagingController.deleteMessage);

// Search users (for messaging)
router.get('/search-users', authenticate, messagingController.searchUsers);

export default router;

