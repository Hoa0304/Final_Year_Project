import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as messagingService from '../services/messaging.service';
import { supabase } from '../utils/supabase';

/**
 * Get or create a direct conversation with another user
 */
export async function getOrCreateConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { other_user_id } = req.body;

    if (!other_user_id) {
      return res.status(400).json({ error: 'other_user_id is required' });
    }

    if (other_user_id === userId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const conversation = await messagingService.getOrCreateDirectConversation(
      userId,
      other_user_id
    );

    res.json(conversation);
  } catch (error: any) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to get or create conversation' });
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const conversations = await messagingService.getUserConversations(userId);
    res.json(conversations);
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
  }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const conversation = await messagingService.getConversationById(userId, id);
    res.json(conversation);
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversation' });
  }
}

/**
 * Get messages in a conversation
 */
export async function getMessages(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await messagingService.getConversationMessages(userId, id, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
}

/**
 * Send a message
 */
export async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { conversation_id, content, message_type, image_url, file_url, file_name } = req.body;

    if (!conversation_id || !content) {
      return res.status(400).json({ error: 'conversation_id and content are required' });
    }

    const message = await messagingService.sendMessage(userId, {
      conversation_id,
      content,
      message_type,
      image_url,
      file_url,
      file_name,
    });

    res.json(message);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
}

/**
 * Mark messages as read
 */
export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await messagingService.markMessagesAsRead(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark messages as read' });
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await messagingService.deleteMessage(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
}

/**
 * Search users (for messaging)
 * Returns all users (both regular users and vendors) that can be messaged
 */
export async function searchUsers(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { search, limit } = req.query;

    const limitValue = limit ? parseInt(limit as string) : 20;
    const searchQuery = search as string;

    // Query all users (both 'user' and 'vendor' roles), excluding the current user
    let query = supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .neq('id', userId) // Exclude current user
      .in('role', ['user', 'vendor'])
      .order('created_at', { ascending: false })
      .limit(limitValue);

    // Filter by search (name or email)
    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Search users error:', error);
      return res.status(500).json({ error: 'Failed to search users' });
    }

    // Get product count for vendors
    const usersWithCounts = await Promise.all(
      (users || []).map(async (user: any) => {
        if (user.role === 'vendor') {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', user.id)
            .eq('is_active', true);

          return {
            ...user,
            productCount: count || 0
          };
        }
        return {
          ...user,
          productCount: 0
        };
      })
    );

    res.json(usersWithCounts);
  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({ error: error.message || 'Failed to search users' });
  }
}

