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
  StatusBar,
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

  const otherUserId = (route.params as any)?.userId;

  const {
    data: conversations,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['messagingConversations'],
    queryFn: getConversations,
  });

  const {
    data: conversation,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: ['messagingConversation', selectedConversationId],
    queryFn: () => getConversation(selectedConversationId!),
    enabled: !!selectedConversationId,
  });

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['messagingMessages', selectedConversationId],
    queryFn: () => getMessages(selectedConversationId!, 1, 100),
    enabled: !!selectedConversationId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (otherUserId && otherUserId !== user?.id) {
      handleStartConversation(otherUserId);
    }
  }, [otherUserId]);

  useEffect(() => {
    if (selectedConversationId && conversation) {
      markAsReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId, conversation]);

  useEffect(() => {
    if (messagesData?.messages && messagesData.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messagesData?.messages]);

  const {
    data: searchResults,
    isLoading: isLoadingSearch,
  } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => searchUsers(searchQuery, 20),
    enabled: showSearchModal && searchQuery.length > 0,
  });

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

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messagingConversations'] });
    },
  });

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
    return date.toLocaleDateString('en-US');
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherParticipant = item.participants?.find((p) => p.user_id !== user?.id);
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
              <Ionicons name="person" size={22} color="#475569" />
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
                <Ionicons name="person" size={14} color="#475569" />
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
    const chatTitle = otherParticipant?.user?.full_name || otherParticipant?.user?.email || conversation.title || 'User';
    const chatAvatar = otherParticipant?.user?.avatar_url;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={handleBackToConversations} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={22} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            {chatAvatar ? (
              <Image source={{ uri: chatAvatar }} style={styles.chatHeaderAvatar} />
            ) : (
              <View style={styles.chatHeaderAvatarPlaceholder}>
                <Ionicons name="person" size={18} color="#475569" />
              </View>
            )}
            <View>
              <Text style={styles.chatHeaderTitle}>{chatTitle}</Text>
              <Text style={styles.chatHeaderStatus}>Active now</Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messagesData?.messages || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingMessages}
              onRefresh={refetchMessages}
              tintColor="#0ea5e9"
              colors={['#0ea5e9']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#1E293B" style={{ marginBottom: 12 }} />
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
              placeholderTextColor="#475569"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => setShowSearchModal(true)}
          style={styles.newMessageButton}
        >
          <Ionicons name="create-outline" size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations || []}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.conversationsList}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingConversations}
            onRefresh={refetchConversations}
            tintColor="#0ea5e9"
            colors={['#0ea5e9']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubbles-outline" size={40} color="#334155" />
            </View>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Chat with other users or sellers!</Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => setShowSearchModal(true)}
            >
              <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>Create new message</Text>
            </TouchableOpacity>
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
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#475569" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users or sellers..."
                placeholderTextColor="#475569"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
            {isLoadingSearch ? (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color="#0ea5e9" />
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
                      <Ionicons name="person" size={22} color="#475569" />
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
                <Ionicons name="search-outline" size={36} color="#1E293B" style={{ marginBottom: 12 }} />
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
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
    marginLeft: 12,
  },
  newMessageButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationsList: {
    padding: 12,
    paddingBottom: 32,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 13,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  conversationAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#020617',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 8,
  },
  conversationPreview: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#334155',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCreateBtn: {
    marginTop: 20,
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCreateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#020617',
    justifyContent: 'space-between',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  chatHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chatHeaderAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 1,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  messageAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: width * 0.72,
    padding: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#0ea5e9',
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderBottomLeftRadius: 5,
  },
  messageSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 21,
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
    fontSize: 10,
    color: '#475569',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptyMessagesSubtext: {
    fontSize: 13,
    color: '#334155',
    marginTop: 6,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#E2E8F0',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1E293B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
  },
  searchLoading: {
    padding: 32,
    alignItems: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  searchResultAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 3,
  },
  searchResultEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  searchResultMeta: {
    fontSize: 12,
    color: '#475569',
  },
  selfBadge: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  searchEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#475569',
  },
});
