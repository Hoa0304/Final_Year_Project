import api from '../config/api';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  participants?: Participant[];
  last_message?: Message;
  unread_count?: number;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'member' | 'admin';
  last_read_at?: string;
  is_muted: boolean;
  joined_at: string;
  user?: {
    id: string;
    full_name?: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  image_url?: string;
  file_url?: string;
  file_name?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name?: string;
    email: string;
    avatar_url?: string;
  };
  is_read?: boolean;
}

export interface SendMessageParams {
  conversation_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
  image_url?: string;
  file_url?: string;
  file_name?: string;
}

/**
 * Get or create a direct conversation with another user
 */
export async function getOrCreateConversation(otherUserId: string): Promise<Conversation> {
  const response = await api.post('/messaging/conversations/get-or-create', {
    other_user_id: otherUserId,
  });
  return response.data;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await api.get('/messaging/conversations');
  return response.data;
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await api.get(`/messaging/conversations/${conversationId}`);
  return response.data;
}

/**
 * Get messages in a conversation
 */
export async function getMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: Message[]; total: number }> {
  const response = await api.get(`/messaging/conversations/${conversationId}/messages`, {
    params: { page, limit },
  });
  return response.data;
}

/**
 * Send a message
 */
export async function sendMessage(params: SendMessageParams): Promise<Message> {
  const response = await api.post('/messaging/messages', params);
  return response.data;
}

/**
 * Mark messages as read
 */
export async function markAsRead(conversationId: string): Promise<void> {
  await api.post(`/messaging/conversations/${conversationId}/read`);
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await api.delete(`/messaging/messages/${messageId}`);
}

export interface SearchUser {
  id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'vendor' | 'admin';
  created_at: string;
  productCount?: number;
}

/**
 * Search users (for messaging)
 * Returns all users (both regular users and vendors) that can be messaged
 */
export async function searchUsers(search?: string, limit?: number): Promise<SearchUser[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (limit) params.append('limit', String(limit));

  const response = await api.get(`/messaging/search-users?${params.toString()}`);
  return response.data;
}

