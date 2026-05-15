/**
 * Chat Controller
 * Handles AI chatbot conversations and messages
 */

import { Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendChatMessage, hasAIAccess, ChatMessage } from '../services/groq.service';

/**
 * Get all conversations for a user
 */
export async function getConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Get conversations error:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a specific conversation with its messages
 */
export async function getConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Get messages error:', msgError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { title } = req.body;

    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        title: title || 'New Conversation',
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Create conversation error:', error);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    // Create greeting message asynchronously (don't wait)
    const greetingMessage = `Hello! I'm the AI Assistant for HMall. I can help you with:
      
• Expense management and budgeting
• Product and voucher advice
• App features and usage guidance
• Financial and investment advice
• And much more!

How can I assist you today? 😊`;

    // Don't await - let it run in background
    (async () => {
      try {
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: greetingMessage,
            metadata: {
              is_greeting: true,
            },
          });
        // Success - message created
      } catch (err: any) {
        console.error('Failed to create greeting message:', err);
        // Don't fail the request if greeting fails
      }
    })();

    // Return immediately without waiting for greeting
    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Send a message and get AI response
 */
export async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { conversationId, message, model } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if user is VKU student (free access)
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasAccess = hasAIAccess(user.email);
    
    // Rate limiting for users (basic implementation)
    // TODO: Implement more sophisticated rate limiting with Redis or database
    if (hasAccess) {
      // Check message length to prevent abuse
      if (message.length > 2000) {
        return res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
      }
      
      // Check for spam patterns (simple check)
      const spamPatterns = [
        /(.)\1{10,}/, // Repeated characters
        /[A-Z]{20,}/, // All caps
      ];
      
      if (spamPatterns.some(pattern => pattern.test(message))) {
        return res.status(400).json({ error: 'Invalid message format.' });
      }
    }

    // Get or create conversation
    let conversationIdToUse = conversationId;
    
    if (!conversationIdToUse) {
      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 50) || 'New Conversation',
          is_active: true,
        })
        .select('*')
        .single();

      if (convError) {
        console.error('Create conversation error:', convError);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }

      conversationIdToUse = newConversation.id;
      // Greeting message is already created in createConversation endpoint
      // No need to create it again here
    } else {
      // Verify conversation belongs to user
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', conversationIdToUse)
        .eq('user_id', userId)
        .single();

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    }

    // Get conversation history
    const { data: existingMessages } = await supabase
      .from('chat_messages')
      .select('role, content, metadata')
      .eq('conversation_id', conversationIdToUse)
      .order('created_at', { ascending: true })
      .limit(20); // Limit to last 20 messages for context

    // Build message history for AI
    const messageHistory: ChatMessage[] = [];
    
    // Add system prompt if this is the first message in conversation
    if (!existingMessages || existingMessages.length === 0) {
      messageHistory.push({
        role: 'system',
        content: `You are a helpful AI assistant for HMall, a comprehensive financial and lifestyle management application. 

HMall offers:
- Expense Management: Track spending, set budgets, and manage savings goals
- Marketplace: Shop for products with vouchers and discounts
- Stock Trading: Simulate stock market investments
- Task Management: Organize daily tasks and activities
- Games: Entertainment with Tic Tac Toe and Quiz games
- AI Recommendations: Get personalized spending and investing advice

You should:
- Greet users warmly and introduce yourself as the HMall AI assistant
- Help users with questions about the app features
- Provide financial advice and tips
- Assist with expense management, budgeting, and savings
- Answer questions about products, vouchers, and marketplace features
- Be friendly, professional, and helpful
- Respond in Vietnamese or English based on user's language preference

Always be concise, helpful, and focus on providing actionable advice.`,
      });
    }
    
    // Map existing messages (skip greeting message when building AI context)
    if (existingMessages && existingMessages.length > 0) {
      const nonGreetingMessages = existingMessages.filter((msg: any) => 
        !(msg.role === 'assistant' && msg.metadata?.is_greeting)
      );
      messageHistory.push(...nonGreetingMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })));
    }

    // Add current user message
    messageHistory.push({
      role: 'user',
      content: message.trim(),
    });

    // Save user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationIdToUse,
        role: 'user',
        content: message.trim(),
      });

    if (userMsgError) {
      console.error('Save user message error:', userMsgError);
      // Continue anyway, don't fail the request
    }

    // Get AI response
    const aiResponse = await sendChatMessage(messageHistory, model || 'llama-3.3-70b-versatile');

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationIdToUse,
        role: 'assistant',
        content: aiResponse.message,
        metadata: {
          model: aiResponse.model,
          usage: aiResponse.usage,
          finish_reason: aiResponse.finish_reason,
        },
      });

    if (aiMsgError) {
      console.error('Save AI message error:', aiMsgError);
      // Continue anyway, return response
    }

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationIdToUse);

    res.json({
      conversationId: conversationIdToUse,
      message: aiResponse.message,
      model: aiResponse.model,
      usage: aiResponse.usage,
      hasAIAccess: hasAccess,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    
    // Return user-friendly error message
    res.status(500).json({
      error: error.message || 'Failed to get AI response. Please try again later.',
    });
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;

    // Verify conversation belongs to user
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Soft delete (mark as inactive)
    const { error } = await supabase
      .from('chat_conversations')
      .update({ is_active: false })
      .eq('id', conversationId);

    if (error) {
      console.error('Delete conversation error:', error);
      return res.status(500).json({ error: 'Failed to delete conversation' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Verify conversation belongs to user
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: updated, error } = await supabase
      .from('chat_conversations')
      .update({ title: title.trim() })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) {
      console.error('Update conversation title error:', error);
      return res.status(500).json({ error: 'Failed to update title' });
    }

    res.json({ conversation: updated });
  } catch (error) {
    console.error('Update conversation title error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

