import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConversations,
  getConversation,
  sendMessage,
  createConversation,
  deleteConversation,
  updateConversationTitle,
  ChatMessage,
  ChatConversation,
} from '../../services/chat.service';
import { useAuth } from '../../context/AuthContext';

export default function ChatScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [showConversations, setShowConversations] = useState(false);

  // Fetch conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['chatConversations'],
    queryFn: getConversations,
  });

  // Fetch current conversation messages
  const { data: conversationData, refetch: refetchConversation } = useQuery({
    queryKey: ['chatConversation', currentConversationId],
    queryFn: () => getConversation(currentConversationId!),
    enabled: !!currentConversationId,
  });

  // Optimistic greeting message for new conversations
  const [optimisticGreeting, setOptimisticGreeting] = React.useState<ChatMessage | null>(null);

  const messages = React.useMemo(() => {
    const dbMessages = conversationData?.messages || [];
    // If we have optimistic greeting and no messages yet, show it
    if (optimisticGreeting && dbMessages.length === 0) {
      return [optimisticGreeting];
    }
    // Once we have real messages, clear optimistic and use real ones
    if (dbMessages.length > 0 && optimisticGreeting) {
      setOptimisticGreeting(null);
    }
    return dbMessages;
  }, [conversationData?.messages, optimisticGreeting]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => sendMessage(currentConversationId, message),
    onSuccess: (data) => {
      setMessageText('');
      setIsSending(false);
      
      // Update conversation ID if new conversation was created
      if (data.conversationId !== currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
      
      // Refetch conversations and current conversation
      refetchConversations();
      refetchConversation();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error: any) => {
      setIsSending(false);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to send message. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
      if (currentConversationId) {
        setCurrentConversationId(undefined);
      }
    },
  });

  // Handle send message
  const handleSend = () => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    Keyboard.dismiss();
    sendMessageMutation.mutate(messageText.trim());
  };

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (conversation) => {
      setCurrentConversationId(conversation.id);
      setMessageText('');
      setShowConversations(false);
      refetchConversations();
      
      // Show greeting message immediately (optimistic update)
      const greetingMessage: ChatMessage = {
        id: 'temp-greeting',
        conversation_id: conversation.id,
        role: 'assistant',
        content: `Hello! I'm the AI Assistant for HMall. I can help you with:
      
• Expense management and budgeting
• Product and voucher advice
• App features and usage guidance
• Financial and investment advice
• And much more!

How can I assist you today? 😊`,
        created_at: new Date().toISOString(),
      };
      setOptimisticGreeting(greetingMessage);
      
      // Refetch in background to get real greeting from backend
      setTimeout(() => {
        refetchConversation();
      }, 1000);
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create conversation. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  // Handle new conversation
  const handleNewConversation = () => {
    createConversationMutation.mutate('New Conversation');
  };

  // Handle select conversation
  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowConversations(false);
  };

  // Handle delete conversation
  const handleDeleteConversation = (conversationId: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteConversationMutation.mutate(conversationId);
            if (currentConversationId === conversationId) {
              setCurrentConversationId(undefined);
            }
          },
        },
      ]
    );
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        currentConversationId === item.id && styles.conversationItemActive,
      ]}
      onPress={() => handleSelectConversation(item.id)}
      onLongPress={() => handleDeleteConversation(item.id)}
    >
      <View style={styles.conversationItemContent}>
        <Ionicons name="chatbubbles" size={20} color="#007AFF" />
        <View style={styles.conversationItemText}>
          <Text style={styles.conversationItemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.conversationItemDate}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteConversation(item.id)}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Chat Assistant</Text>
          <TouchableOpacity
            onPress={() => setShowConversations(!showConversations)}
            style={styles.menuButton}
          >
            <Ionicons name={showConversations ? 'close' : 'menu'} size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* Conversations Sidebar */}
          {showConversations && (
            <View style={styles.conversationsSidebar}>
              <View style={styles.conversationsHeader}>
                <Text style={styles.conversationsTitle}>Conversations</Text>
                <TouchableOpacity
                  onPress={handleNewConversation}
                  style={styles.newConversationButton}
                >
                  <Ionicons name="add" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={styles.emptyConversations}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No conversations yet</Text>
                    <Text style={styles.emptySubtext}>Start a new conversation to begin</Text>
                  </View>
                }
              />
            </View>
          )}

          {/* Chat Area */}
          <View style={[styles.chatArea, showConversations && styles.chatAreaWithSidebar]}>
          {!currentConversationId ? (
            <View style={styles.welcomeContainer}>
              <Ionicons name="chatbubbles" size={64} color="#007AFF" />
              <Text style={styles.welcomeTitle}>Welcome to AI Chat Assistant</Text>
              <Text style={styles.welcomeText}>
                Ask me anything about HMall and I'll help you!
              </Text>
              <TouchableOpacity
                style={[styles.startButton, createConversationMutation.isPending && styles.startButtonDisabled]}
                onPress={handleNewConversation}
                disabled={createConversationMutation.isPending}
              >
                {createConversationMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.startButtonText}>Start New Conversation</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.welcomeText}>Starting conversation...</Text>
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.emptyText}>Loading conversation...</Text>
                  </View>
                }
                ListHeaderComponent={
                  messages.length === 1 && messages[0]?.role === 'assistant' ? (
                    <View style={styles.quickQuestionsContainer}>
                      <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
                      {[
                        'How do I track my expenses?',
                        'How to set a budget?',
                        'What are vouchers and how to use them?',
                        'How does the stock market work?',
                        'Tell me about savings goals',
                        'How to manage my tasks?',
                      ].map((question, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.quickQuestionButton}
                          onPress={() => {
                            setMessageText(question);
                            setTimeout(() => handleSend(), 100);
                          }}
                        >
                          <Text style={styles.quickQuestionText}>{question}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null
                }
              />

              {/* Input Area */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Type your message..."
                  placeholderTextColor="#999"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={2000}
                  editable={!isSending}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!messageText.trim() || isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    padding: 8,
  },
  conversationsSidebar: {
    width: 280,
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  conversationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  conversationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  newConversationButton: {
    padding: 4,
  },
  conversationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  conversationItemActive: {
    backgroundColor: '#e3f2fd',
  },
  conversationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conversationItemText: {
    flex: 1,
  },
  conversationItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  conversationItemDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatAreaWithSidebar: {
    // Chat area takes remaining space when sidebar is visible
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyConversations: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  quickQuestionsContainer: {
    padding: 16,
    marginBottom: 16,
  },
  quickQuestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  quickQuestionButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#007AFF',
  },
});

