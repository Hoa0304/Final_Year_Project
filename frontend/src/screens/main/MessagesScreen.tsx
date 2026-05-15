import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getOrCreateConversation,
  Conversation,
  Message,
} from '../../services/messaging.service';
import { searchUsers } from '../../services/messaging.service';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

type ViewMode = 'conversations' | 'chat';

export default function MessagesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('conversations');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Get otherUserId from route params if navigating from profile/vendor
  const otherUserId = (route.params as any)?.userId;

  // Fetch conversations list
  const {
    data: conversations,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['messagingConversations'],
    queryFn: getConversations,
  });

  // Fetch selected conversation
  const {
    data: conversation,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: ['messagingConversation', selectedConversationId],
    queryFn: () => getConversation(selectedConversationId!),
    enabled: !!selectedConversationId,
  });

  // Fetch messages
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['messagingMessages', selectedConversationId],
    queryFn: () => getMessages(selectedConversationId!, 1, 100),
    enabled: !!selectedConversationId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Auto-create conversation if otherUserId is provided
  useEffect(() => {
    if (otherUserId && otherUserId !== user?.id) {
      handleStartConversation(otherUserId);
    }
  }, [otherUserId]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversationId && conversation) {
      markAsReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId, conversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesData?.messages && messagesData.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messagesData?.messages]);

  // Search users/vendors
  const {
    data: searchResults,
    isLoading: isLoadingSearch,
  } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => searchUsers(searchQuery, 20),
    enabled: showSearchModal && searchQuery.length > 0,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      sendMessage({
        conversation_id: selectedConversationId!,
        content,
        message_type: 'text',
      }),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messagingMessages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['messagingConversations'] });
      refetchMessages();
      refetchConversations();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send message');
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messagingConversations'] });
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: getOrCreateConversation,
    onSuccess: (data) => {
      setSelectedConversationId(data.id);
      setViewMode('chat');
      queryClient.invalidateQueries({ queryKey: ['messagingConversations'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start conversation');
    },
  });

  const handleStartConversation = (otherUserId: string) => {
    createConversationMutation.mutate(otherUserId);
  };

  const handleOpenConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setViewMode('chat');
  };

  const handleBackToConversations = () => {
    setViewMode('conversations');
    setSelectedConversationId(null);
  };

  const handleSelectUser = (userId: string) => {
    setShowSearchModal(false);
    setSearchQuery('');
    handleStartConversation(userId);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherParticipant = item.participants?.find((p) => p.user_id !== user?.id);
    
    // Debug logging
    if (__DEV__) {
      console.log('Conversation item:', {
        id: item.id,
        title: item.title,
        participants: item.participants?.map(p => ({
          user_id: p.user_id,
          user: p.user ? {
            id: p.user.id,
            full_name: p.user.full_name,
            email: p.user.email,
          } : null,
        })),
        otherParticipant: otherParticipant ? {
          user_id: otherParticipant.user_id,
          user: otherParticipant.user,
        } : null,
      });
    }
    
    // Prefer otherParticipant's user data over title (title might be outdated)
    const displayName = otherParticipant?.user?.full_name || otherParticipant?.user?.email || item.title || 'User';
    const avatarUrl = otherParticipant?.user?.avatar_url;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleOpenConversation(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
          {item.unread_count !== undefined && item.unread_count !== null && item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unread_count > 99 ? '99+' : String(item.unread_count)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.last_message_at && (
              <Text style={styles.conversationTime}>{formatTime(item.last_message_at)}</Text>
            )}
          </View>
          {item.last_message && (
            <Text style={styles.conversationPreview} numberOfLines={1}>
              {item.last_message.sender_id === user?.id ? 'You: ' : ''}
              {item.last_message.content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === user?.id;
    const senderName = item.sender?.full_name || item.sender?.email || 'User';

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.messageAvatar}>
            {item.sender?.avatar_url ? (
              <Image source={{ uri: item.sender.avatar_url }} style={styles.messageAvatarImage} />
            ) : (
              <View style={styles.messageAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#666" />
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {!isMyMessage && (
            <Text style={styles.messageSenderName}>{senderName}</Text>
          )}
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.content}
          </Text>
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.messageImage} />
          )}
          <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (viewMode === 'chat' && conversation) {
    const otherParticipant = conversation.participants?.find((p) => p.user_id !== user?.id);
    
    // Debug logging
    if (__DEV__) {
      console.log('Chat conversation:', {
        id: conversation.id,
        title: conversation.title,
        participants: conversation.participants?.map(p => ({
          user_id: p.user_id,
          user: p.user ? {
            id: p.user.id,
            full_name: p.user.full_name,
            email: p.user.email,
          } : null,
        })),
        otherParticipant: otherParticipant ? {
          user_id: otherParticipant.user_id,
          user: otherParticipant.user,
        } : null,
      });
    }
    
    // Prefer otherParticipant's user data over title
    const chatTitle = otherParticipant?.user?.full_name || otherParticipant?.user?.email || conversation.title || 'User';
    const chatAvatar = otherParticipant?.user?.avatar_url;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={handleBackToConversations} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            {chatAvatar ? (
              <Image source={{ uri: chatAvatar }} style={styles.chatHeaderAvatar} />
            ) : (
              <View style={styles.chatHeaderAvatarPlaceholder}>
                <Ionicons name="person" size={20} color="#666" />
              </View>
            )}
            <Text style={styles.chatHeaderTitle}>{chatTitle}</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messagesData?.messages || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          refreshControl={
            <RefreshControl refreshing={isLoadingMessages} onRefresh={refetchMessages} />
          }
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>No messages yet</Text>
              <Text style={styles.emptyMessagesSubtext}>Start the conversation!</Text>
            </View>
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
              color="#000"
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => setShowSearchModal(true)}
          style={styles.newMessageButton}
        >
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations || []}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={isLoadingConversations} onRefresh={refetchConversations} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation with a user or vendor!</Text>
          </View>
        }
      />

      {/* Search Modal */}
      <Modal visible={showSearchModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Message</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users or vendors..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                color="#000"
              />
            </View>
            {isLoadingSearch ? (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : searchQuery.length > 0 && searchResults ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleSelectUser(item.id)}
                    disabled={item.id === user?.id}
                  >
                    <View style={styles.searchResultAvatar}>
                      <Ionicons name="person" size={24} color="#666" />
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>
                        {item.full_name || item.email || 'User'}
                      </Text>
                      <Text style={styles.searchResultEmail}>{item.email}</Text>
                      {item.productCount !== undefined && item.productCount !== null && (
                        <Text style={styles.searchResultMeta}>
                          {String(item.productCount)} products
                        </Text>
                      )}
                    </View>
                    {item.id === user?.id && (
                      <Text style={styles.selfBadge}>You</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.searchEmpty}>
                    <Text style={styles.searchEmptyText}>No users found</Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.searchEmpty}>
                <Text style={styles.searchEmptyText}>Start typing to search...</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  newMessageButton: {
    padding: 8,
  },
  conversationsList: {
    padding: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  conversationAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#65676b',
    marginLeft: 8,
  },
  conversationPreview: {
    fontSize: 14,
    color: '#65676b',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#65676b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8a8d91',
    marginTop: 8,
    textAlign: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  chatHeaderAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 80,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: width * 0.7,
    padding: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#f0f2f5',
    borderBottomLeftRadius: 4,
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#65676b',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 8,
    resizeMode: 'cover',
  },
  messageTime: {
    fontSize: 11,
    color: '#65676b',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#65676b',
    marginTop: 16,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#8a8d91',
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchLoading: {
    padding: 32,
    alignItems: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  searchResultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  searchResultEmail: {
    fontSize: 14,
    color: '#65676b',
    marginBottom: 2,
  },
  searchResultMeta: {
    fontSize: 12,
    color: '#8a8d91',
  },
  selfBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  searchEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#8a8d91',
  },
});

