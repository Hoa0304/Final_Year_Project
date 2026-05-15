import { supabase } from '../utils/supabase';

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

export interface CreateConversationParams {
  participant_ids: string[];
  type?: 'direct' | 'group';
  title?: string;
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
 * Get or create a direct conversation between two users
 */
export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string
): Promise<Conversation> {
  // Check if conversation already exists
  const { data: existingParticipants } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (existingParticipants && existingParticipants.length > 0) {
    const conversationIds = existingParticipants.map((p: any) => p.conversation_id);

    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', conversationIds);

    if (otherParticipants && otherParticipants.length > 0) {
      // Find direct conversation (only 2 participants)
      for (const convId of otherParticipants.map((p: any) => p.conversation_id)) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convId);

        if (participants && participants.length === 2) {
          const { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', convId)
            .eq('type', 'direct')
            .single();

          if (conversation) {
            return await getConversationById(userId, convId);
          }
        }
      }
    }
  }

  // Create new conversation
  const { data: newConversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'direct',
    })
    .select('*')
    .single();

  if (convError || !newConversation) {
    throw new Error(`Failed to create conversation: ${convError?.message}`);
  }

  // Add participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: newConversation.id, user_id: userId },
    { conversation_id: newConversation.id, user_id: otherUserId },
  ]);

  return await getConversationById(userId, newConversation.id);
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data: participants, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  if (!participants || participants.length === 0) {
    return [];
  }

  const conversationIds = participants.map((p: any) => p.conversation_id);

  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (convError) {
    throw new Error(`Failed to fetch conversations: ${convError.message}`);
  }

  console.log(`📊 Found ${conversations?.length || 0} conversations for user ${userId}`);
  console.log(`📋 Conversation IDs:`, conversationIds);

  // Fetch participants and last message for each conversation
  const conversationsWithData = await Promise.all(
    (conversations || []).map(async (conv: any) => {
      const [participantsData, lastMessageData, participantData] = await Promise.all([
        supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', conv.id),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('conversation_participants')
          .select('last_read_at')
          .eq('conversation_id', conv.id)
          .eq('user_id', userId)
          .single(),
      ]);

      // Fetch user data for each participant
      const participantRecords = await Promise.all(
        (participantsData.data || []).map(async (p: any) => {
          // Query user data separately
          console.log(`🔍 Querying user for participant ${p.user_id}...`);
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', p.user_id)
            .single();
          
          if (userError) {
            console.error(`❌ Error fetching user ${p.user_id}:`, {
              error: userError,
              message: userError.message,
              details: userError.details,
              hint: userError.hint,
            });
          }
          
          // Debug logging
          if (user) {
            console.log(`✅ Fetched user for participant ${p.user_id}:`, {
              id: user.id,
              full_name: user.full_name,
              email: user.email,
            });
          } else {
            console.warn(`⚠️ No user found for participant ${p.user_id} (user_id: ${p.user_id})`);
            // Try querying all users to see if table is accessible
            const { data: allUsers, error: allUsersError } = await supabase
              .from('users')
              .select('id, full_name, email')
              .limit(5);
            if (allUsersError) {
              console.error(`❌ Cannot query users table at all:`, allUsersError);
            } else {
              console.log(`📋 Sample users in table:`, allUsers?.map((u: any) => ({ 
                id: u.id, 
                full_name: u.full_name, 
                email: u.email 
              })));
            }
          }
          
          return {
            ...p,
            user: user ? {
              id: user.id,
              full_name: user.full_name || null,
              email: user.email || null,
            } : null,
          };
        })
      );

      // Get other participant (for direct messages)
      const otherParticipant = participantRecords.find((p: any) => p.user_id !== userId);

      // Get sender info for last message
      let lastMessage = null;
      if (lastMessageData.data) {
        const { data: senderData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', lastMessageData.data.sender_id)
          .single();

        lastMessage = {
          ...lastMessageData.data,
          sender: senderData || undefined,
        };
      }

      // Calculate unread count
      const lastReadAt = participantData.data?.last_read_at || '1970-01-01';
      const { count: unreadCountValue } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .gt('created_at', lastReadAt);

      const result = {
        ...conv,
        participants: participantRecords,
        last_message: lastMessage || undefined,
        unread_count: unreadCountValue || 0,
        // For direct messages, use other participant's name as title
        title:
          conv.type === 'direct' && otherParticipant?.user
            ? otherParticipant.user.full_name || otherParticipant.user.email
            : conv.title,
      };
      
      // Debug logging
      console.log(`💬 Conversation ${conv.id}:`, {
        type: conv.type,
        title: result.title,
        participants_count: participantRecords.length,
        other_participant: otherParticipant ? {
          user_id: otherParticipant.user_id,
          full_name: otherParticipant.user?.full_name,
          email: otherParticipant.user?.email,
        } : null,
      });
      
      return result;
    })
  );

  return conversationsWithData as Conversation[];
}

/**
 * Get conversation by ID
 */
export async function getConversationById(
  userId: string,
  conversationId: string
): Promise<Conversation> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  // Check if user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    throw new Error('User is not a participant in this conversation');
  }

  // Fetch participants
  const { data: participantsData } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId);

  // Fetch user data for each participant
  const participants = await Promise.all(
    (participantsData || []).map(async (p: any) => {
      // Query user data separately
      console.log(`🔍 Querying user for participant ${p.user_id}...`);
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', p.user_id)
        .single();
      
      if (userError) {
        console.error(`❌ Error fetching user ${p.user_id}:`, {
          error: userError,
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
        });
      }
      
      if (user) {
        console.log(`✅ Fetched user for participant ${p.user_id}:`, {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
        });
      } else {
        console.warn(`⚠️ No user found for participant ${p.user_id}`);
      }
      
      return {
        ...p,
        user: user ? {
          id: user.id,
          full_name: user.full_name || null,
          email: user.email || null,
        } : null,
      };
    })
  );

  // Get other participant (for direct messages)
  const otherParticipant = participants.find((p: any) => p.user_id !== userId);

  return {
    ...conversation,
    participants: participants as Participant[],
    title:
      conversation.type === 'direct' && otherParticipant?.user
        ? otherParticipant.user.full_name || otherParticipant.user.email
        : conversation.title,
  } as Conversation;
}

/**
 * Get messages in a conversation
 */
export async function getConversationMessages(
  userId: string,
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: Message[]; total: number }> {
  // Check if user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    throw new Error('User is not a participant in this conversation');
  }

  const { data: messages, error, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  // Fetch sender info and read status for each message
  const messagesWithData = await Promise.all(
    (messages || []).map(async (msg: any) => {
      const [senderData, readData] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', msg.sender_id)
          .single(),
        supabase
          .from('message_reads')
          .select('read_at')
          .eq('message_id', msg.id)
          .eq('user_id', userId)
          .single(),
      ]);

      return {
        ...msg,
        sender: senderData.data || undefined,
        is_read: !!readData.data,
      };
    })
  );

  return {
    messages: messagesWithData.reverse() as Message[], // Reverse to show oldest first
    total: count || 0,
  };
}

/**
 * Send a message
 */
export async function sendMessage(
  userId: string,
  params: SendMessageParams
): Promise<Message> {
  // Check if user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', params.conversation_id)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    throw new Error('User is not a participant in this conversation');
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversation_id,
      sender_id: userId,
      content: params.content,
      message_type: params.message_type || 'text',
      image_url: params.image_url || null,
      file_url: params.file_url || null,
      file_name: params.file_name || null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  // Fetch sender info
  const { data: senderData } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', userId)
    .single();

  return {
    ...message,
    sender: senderData || undefined,
    is_read: false,
  } as Message;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  userId: string,
  conversationId: string
): Promise<void> {
  // Update participant's last_read_at
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  // Get participant's last_read_at
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  const lastReadAt = participant?.last_read_at || '1970-01-01';

  // Get unread messages
  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .gt('created_at', lastReadAt);

  if (unreadMessages && unreadMessages.length > 0) {
    // Create read receipts
    const readReceipts = unreadMessages.map((msg: any) => ({
      message_id: msg.id,
      user_id: userId,
    }));

    await supabase.from('message_reads').upsert(readReceipts, {
      onConflict: 'message_id,user_id',
    });
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(userId: string, messageId: string): Promise<void> {
  const { data: message } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('id', messageId)
    .single();

  if (!message || message.sender_id !== userId) {
    throw new Error('You can only delete your own messages');
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

