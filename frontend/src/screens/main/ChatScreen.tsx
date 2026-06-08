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
  StatusBar,
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

  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['chatConversations'],
    queryFn: getConversations,
  });

  const { data: conversationData, refetch: refetchConversation } = useQuery({
    queryKey: ['chatConversation', currentConversationId],
    queryFn: () => getConversation(currentConversationId!),
    enabled: !!currentConversationId,
  });

  const [optimisticGreeting, setOptimisticGreeting] = React.useState<ChatMessage | null>(null);

  const messages = React.useMemo(() => {
    const dbMessages = conversationData?.messages || [];
    if (optimisticGreeting && dbMessages.length === 0) {
      return [optimisticGreeting];
    }
    if (dbMessages.length > 0 && optimisticGreeting) {
      setOptimisticGreeting(null);
    }
    return dbMessages;
  }, [conversationData?.messages, optimisticGreeting]);

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => sendMessage(currentConversationId, message),
    onSuccess: (data) => {
      setMessageText('');
      setIsSending(false);
      if (data.conversationId !== currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
      refetchConversations();
      refetchConversation();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error: any) => {
      setIsSending(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send message. Please try again.', [{ text: 'OK' }]);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
      if (currentConversationId) {
        setCurrentConversationId(undefined);
      }
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || isSending) return;
    setIsSending(true);
    Keyboard.dismiss();
    sendMessageMutation.mutate(messageText.trim());
  };

  const createConversationMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (conversation) => {
      setCurrentConversationId(conversation.id);
      setMessageText('');
      setShowConversations(false);
      refetchConversations();
      const greetingMessage: ChatMessage = {
        id: 'temp-greeting',
        conversation_id: conversation.id,
        role: 'assistant',
        content: `Hello! I am the HMall AI Assistant. I can help you with:\n\n• Expense & budget management\n• Product & voucher consultation\n• App usage guidelines\n• Financial & investment advice\n• And much more!\n\nHow can I help you today? 😊`,
        created_at: new Date().toISOString(),
      };
      setOptimisticGreeting(greetingMessage);
      setTimeout(() => {
        refetchConversation();
      }, 1000);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create conversation.', [{ text: 'OK' }]);
    },
  });

  const handleNewConversation = () => {
    createConversationMutation.mutate('New Conversation');
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowConversations(false);
  };

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
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={14} color="#0ea5e9" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
            {item.content}
          </Text>
        </View>
        <Text style={[styles.messageTime, isUser && styles.messageTimeRight]}>
          {new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => (
    <TouchableOpacity
      style={[styles.convItem, currentConversationId === item.id && styles.convItemActive]}
      onPress={() => handleSelectConversation(item.id)}
      onLongPress={() => handleDeleteConversation(item.id)}
    >
      <View style={styles.convItemLeft}>
        <View style={[styles.convItemIcon, currentConversationId === item.id && styles.convItemIconActive]}>
          <Ionicons name="chatbubbles" size={16} color={currentConversationId === item.id ? '#0ea5e9' : '#64748B'} />
        </View>
        <View style={styles.convItemText}>
          <Text style={styles.convItemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.convItemDate}>
            {new Date(item.updated_at).toLocaleDateString('en-US')}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDeleteConversation(item.id)} style={styles.convDeleteBtn}>
        <Ionicons name="trash-outline" size={16} color="#475569" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const quickQuestions = [
    'How to track expenses?',
    'How to set a budget?',
    'What is a voucher and how to use it?',
    'Tips for saving money effectively?',
    'How to manage tasks?',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={22} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color="#0ea5e9" />
            </View>
            <Text style={styles.headerTitle}>AI Chat Assistant</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowConversations(!showConversations)}
            style={styles.headerBtn}
          >
            <Ionicons name={showConversations ? 'close' : 'menu'} size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* Conversations Sidebar */}
          {showConversations && (
            <View style={styles.sidebar}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>History</Text>
                <TouchableOpacity onPress={handleNewConversation} style={styles.newConvBtn}>
                  <Ionicons name="add" size={20} color="#0ea5e9" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={styles.sidebarEmpty}>
                    <Ionicons name="chatbubbles-outline" size={36} color="#1E293B" />
                    <Text style={styles.sidebarEmptyText}>No conversations yet</Text>
                  </View>
                }
              />
            </View>
          )}

          {/* Chat Area */}
          <View style={styles.chatArea}>
            {!currentConversationId ? (
              <View style={styles.welcomeContainer}>
                <View style={styles.welcomeIconCircle}>
                  <Ionicons name="sparkles" size={40} color="#0ea5e9" />
                </View>
                <Text style={styles.welcomeTitle}>Welcome to AI Chat</Text>
                <Text style={styles.welcomeText}>
                  Ask me anything about HMall, finance, or life!
                </Text>
                <TouchableOpacity
                  style={[styles.startBtn, createConversationMutation.isPending && styles.startBtnDisabled]}
                  onPress={handleNewConversation}
                  disabled={createConversationMutation.isPending}
                >
                  {createConversationMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.startBtnText}>Start Conversation</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Quick questions */}
                <View style={styles.quickSection}>
                  <Text style={styles.quickTitle}>Suggested Questions</Text>
                  {quickQuestions.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickBtn}
                      onPress={() => {
                        handleNewConversation();
                        setMessageText(q);
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color="#0ea5e9" style={{ marginRight: 8 }} />
                      <Text style={styles.quickBtnText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={styles.loadingText}>Initializing conversation...</Text>
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
                />
                {/* Input Area */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#475569"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={2000}
                    editable={!isSending}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, (!messageText.trim() || isSending) && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!messageText.trim() || isSending}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={18} color="#fff" />
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
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
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
    borderBottomColor: '#1E293B',
    backgroundColor: '#020617',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  aiBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#0A111D',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  newConvBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  convItemActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  convItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  convItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  convItemIconActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  convItemText: {
    flex: 1,
  },
  convItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 2,
  },
  convItemDate: {
    fontSize: 11,
    color: '#475569',
  },
  convDeleteBtn: {
    padding: 4,
  },
  sidebarEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  sidebarEmptyText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 12,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  welcomeIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  startBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    justifyContent: 'center',
  },
  startBtnDisabled: {
    backgroundColor: '#1E293B',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  quickSection: {
    width: '100%',
    marginTop: 32,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  quickBtnText: {
    fontSize: 13,
    color: '#94A3B8',
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 16,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 13,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#0ea5e9',
    borderBottomRightRadius: 5,
  },
  assistantBubble: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#CBD5E1',
  },
  messageTime: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  messageTimeRight: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#020617',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: '#E2E8F0',
    maxHeight: 110,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1E293B',
  },
});
