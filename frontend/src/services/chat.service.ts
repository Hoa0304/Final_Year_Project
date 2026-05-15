import api from '../config/api';

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  created_at: string;
}

export interface SendMessageRequest {
  conversationId?: string;
  message: string;
  model?: string;
}

export interface SendMessageResponse {
  conversationId: string;
  message: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  hasAIAccess: boolean;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<ChatConversation[]> {
  const response = await api.get<{ conversations: ChatConversation[] }>('/chat/conversations');
  return response.data.conversations;
}

/**
 * Get a specific conversation with its messages
 */
export async function getConversation(conversationId: string): Promise<{
  conversation: ChatConversation;
  messages: ChatMessage[];
}> {
  const response = await api.get<{
    conversation: ChatConversation;
    messages: ChatMessage[];
  }>(`/chat/conversations/${conversationId}`);
  return response.data;
}

/**
 * Create a new conversation
 */
export async function createConversation(title?: string): Promise<ChatConversation> {
  const response = await api.post<{ conversation: ChatConversation }>('/chat/conversations', {
    title: title || 'New Conversation',
  });
  return response.data.conversation;
}

/**
 * Send a message and get AI response
 */
export async function sendMessage(
  conversationId: string | undefined,
  message: string,
  model?: string
): Promise<SendMessageResponse> {
  const response = await api.post<SendMessageResponse>('/chat/messages', {
    conversationId,
    message,
    model,
  });
  return response.data;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await api.delete(`/chat/conversations/${conversationId}`);
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<ChatConversation> {
  const response = await api.put<{ conversation: ChatConversation }>(
    `/chat/conversations/${conversationId}/title`,
    { title }
  );
  return response.data.conversation;
}















