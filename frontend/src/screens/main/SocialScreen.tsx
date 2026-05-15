import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  createPost,
  updatePost,
  deletePost,
  toggleReaction,
  reportContent,
  pinThread,
  lockThread,
  DiscussionThread,
  DiscussionPost,
} from '../../services/social.service';
import { useAuth } from '../../context/AuthContext';
import ImageUploadPicker from '../../components/ImageUploadPicker';

const { width } = Dimensions.get('window');

type ViewMode = 'feed' | 'thread-detail';

export default function SocialScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingContent, setReportingContent] = useState<{ type: 'thread' | 'post'; id: string } | null>(null);
  const [page, setPage] = useState(1);

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);

  // Comment form state
  const [commentContent, setCommentContent] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [replyingToThreadId, setReplyingToThreadId] = useState<string | null>(null);
  const [replyingToPostId, setReplyingToPostId] = useState<string | undefined>();

  // Report form state
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Fetch threads (feed)
  const {
    data: threadsData,
    isLoading: isLoadingThreads,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ['socialThreads', page],
    queryFn: () => getThreads(undefined, page, 20),
  });

  // Fetch thread detail for comments
  const {
    data: threadDetail,
    isLoading: isLoadingThread,
    refetch: refetchThread,
  } = useQuery({
    queryKey: ['socialThread', selectedThreadId],
    queryFn: () => getThread(selectedThreadId!, 1, 50),
    enabled: !!selectedThreadId && viewMode === 'thread-detail',
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: createThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialThreads'] });
      setShowCreatePostModal(false);
      setPostTitle('');
      setPostContent('');
      setPostImages([]);
      Alert.alert('Success', 'Post created successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create post');
    },
  });

  // Create post/comment mutation
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialThread', selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ['socialThreads'] });
      setShowCommentModal(false);
      setCommentContent('');
      setCommentImages([]);
      setReplyingToPostId(undefined);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to post comment');
    },
  });

  // Delete thread mutation
  const deleteThreadMutation = useMutation({
    mutationFn: deleteThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialThreads'] });
      Alert.alert('Success', 'Post deleted successfully');
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialThread', selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ['socialThreads'] });
      Alert.alert('Success', 'Comment deleted successfully');
    },
  });

  // Toggle reaction mutation
  const toggleReactionMutation = useMutation({
    mutationFn: toggleReaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialThreads'] });
      queryClient.invalidateQueries({ queryKey: ['socialThread', selectedThreadId] });
    },
  });

  // Report content mutation
  const reportContentMutation = useMutation({
    mutationFn: ({ contentType, contentId, reason, description }: any) =>
      reportContent(contentType, contentId, reason, description),
    onSuccess: () => {
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      setReportingContent(null);
      Alert.alert('Success', 'Content reported. Thank you for your feedback.');
    },
  });

  const handleCreatePost = () => {
    if (!postContent.trim() && postImages.length === 0) {
      Alert.alert('Error', 'Please write something or add an image');
      return;
    }
    createThreadMutation.mutate({
      title: postContent.substring(0, 100) || 'Untitled',
      content: postContent.trim(),
      image_urls: postImages.filter((url) => url.trim()),
    });
  };

  const handleOpenComments = (threadId: string) => {
    setSelectedThreadId(threadId);
    setViewMode('thread-detail');
    // Don't show modal, just switch to detail view
  };

  const handleBackToFeed = () => {
    setViewMode('feed');
    setSelectedThreadId(null);
    setShowCommentModal(false);
  };

  const handlePostComment = () => {
    if (!commentContent.trim() && commentImages.length === 0) {
      Alert.alert('Error', 'Please write something or add an image');
      return;
    }
    if (!selectedThreadId) return;
    createPostMutation.mutate({
      thread_id: selectedThreadId,
      parent_post_id: replyingToPostId,
      content: commentContent.trim(),
      image_urls: commentImages.filter((url) => url.trim()),
    });
  };

  const handleReply = (postId: string) => {
    setReplyingToPostId(postId);
    setCommentContent('');
    setCommentImages([]);
  };

  const handleLike = (contentType: 'thread' | 'post', contentId: string, currentReaction?: string) => {
    const newReaction = currentReaction === 'like' ? 'like' : 'like';
    toggleReactionMutation.mutate({
      content_type: contentType,
      content_id: contentId,
      reaction_type: newReaction,
    });
  };

  const handleReport = (type: 'thread' | 'post', id: string) => {
    setReportingContent({ type, id });
    setShowReportModal(true);
  };

  const handleSubmitReport = () => {
    if (!reportReason.trim()) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }
    if (!reportingContent) return;
    reportContentMutation.mutate({
      contentType: reportingContent.type,
      contentId: reportingContent.id,
      reason: reportReason.trim(),
      description: reportDescription.trim(),
    });
  };

  const handleDeletePost = (threadId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteThreadMutation.mutate(threadId),
      },
    ]);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderPost = (thread: DiscussionThread) => {
    return (
      <View key={thread.id} style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.postAuthor}>
            {thread.author?.avatar_url ? (
              <Image source={{ uri: thread.author.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="#666" />
              </View>
            )}
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>
                {thread.author?.full_name || thread.author?.email || 'User'}
              </Text>
              <Text style={styles.postTime}>{formatTimeAgo(thread.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleReport('thread', thread.id)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        {thread.content && (
          <Text style={styles.postText}>{thread.content}</Text>
        )}

        {/* Post Images */}
        {thread.image_urls && thread.image_urls.length > 0 && (
          <View style={styles.postImagesContainer}>
            {thread.image_urls.length === 1 ? (
              <Image source={{ uri: thread.image_urls[0] }} style={styles.singleImage} />
            ) : (
              <View style={styles.multipleImages}>
                {thread.image_urls.slice(0, 4).map((url, index) => (
                  <Image key={index} source={{ uri: url }} style={styles.multiImage} />
                ))}
                {thread.image_urls.length > 4 && (
                  <View style={[styles.multiImage, styles.moreImagesOverlay]}>
                    <Text style={styles.moreImagesText}>+{thread.image_urls.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Product Tag */}
        {thread.product && (
          <View style={styles.productTag}>
            <Ionicons name="cube-outline" size={14} color="#007AFF" />
            <Text style={styles.productTagText}>{thread.product.name}</Text>
          </View>
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike('thread', thread.id, thread.user_reaction)}
          >
            <Ionicons
              name={thread.user_reaction === 'like' ? 'heart' : 'heart-outline'}
              size={22}
              color={thread.user_reaction === 'like' ? '#FF3B30' : '#666'}
            />
            <Text style={[styles.actionText, thread.user_reaction === 'like' && styles.actionTextActive]}>
              {String(thread.reaction_count || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleOpenComments(thread.id)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#666" />
            <Text style={styles.actionText}>{String(thread.post_count || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={22} color="#666" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* View Comments Button */}
        {thread.post_count && thread.post_count > 0 && (
          <TouchableOpacity
            style={styles.viewCommentsButton}
            onPress={() => handleOpenComments(thread.id)}
          >
            <Text style={styles.viewCommentsText}>
              View {thread.post_count} {thread.post_count === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderComment = (post: DiscussionPost, isReply: boolean = false) => (
    <View key={post.id} style={[styles.commentItem, isReply && styles.replyItem]}>
      <View style={styles.commentHeader}>
        {post.author?.avatar_url ? (
          <Image source={{ uri: post.author.avatar_url }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Ionicons name="person" size={16} color="#666" />
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthor}>
              {post.author?.full_name || post.author?.email || 'User'}
            </Text>
            <Text style={styles.commentText}>{post.content}</Text>
          </View>
          {post.image_urls && post.image_urls.length > 0 && (
            <View style={styles.commentImages}>
              {post.image_urls.map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.commentImage} />
              ))}
            </View>
          )}
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>{formatTimeAgo(post.created_at)}</Text>
            <TouchableOpacity onPress={() => handleLike('post', post.id, post.user_reaction)}>
              <Text style={[styles.commentAction, post.user_reaction === 'like' && styles.commentActionActive]}>
                Like
              </Text>
            </TouchableOpacity>
            {!isReply && (
              <TouchableOpacity onPress={() => handleReply(post.id)}>
                <Text style={styles.commentAction}>Reply</Text>
              </TouchableOpacity>
            )}
            {post.created_by === user?.id && (
              <TouchableOpacity onPress={() => handleDeletePost(post.id)}>
                <Text style={[styles.commentAction, styles.deleteAction]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {post.replies && post.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {post.replies.map((reply) => renderComment(reply, true))}
        </View>
      )}
    </View>
  );

  if (viewMode === 'thread-detail' && selectedThreadId && threadDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToFeed} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={isLoadingThread} onRefresh={refetchThread} />}
        >
          {/* Original Post */}
          <View style={styles.originalPost}>
            <View style={styles.postHeader}>
              <View style={styles.postAuthor}>
                {threadDetail.thread.author?.avatar_url ? (
                  <Image source={{ uri: threadDetail.thread.author.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#666" />
                  </View>
                )}
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>
                    {threadDetail.thread.author?.full_name || threadDetail.thread.author?.email || 'User'}
                  </Text>
                  <Text style={styles.postTime}>{formatTimeAgo(threadDetail.thread.created_at)}</Text>
                </View>
              </View>
            </View>
            {threadDetail.thread.content && (
              <Text style={styles.postText}>{threadDetail.thread.content}</Text>
            )}
            {threadDetail.thread.image_urls && threadDetail.thread.image_urls.length > 0 && (
              <View style={styles.postImagesContainer}>
                {threadDetail.thread.image_urls.map((url, index) => (
                  <Image key={index} source={{ uri: url }} style={styles.singleImage} />
                ))}
              </View>
            )}
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>{String(threadDetail.total || 0)} Comments</Text>
            {threadDetail.posts.map((post) => renderComment(post))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        {!threadDetail.thread.is_locked && (
          <View style={styles.commentInputContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.inputAvatar} />
            ) : (
              <View style={styles.inputAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#666" />
              </View>
            )}
            <TouchableOpacity
              style={styles.commentInputButton}
              onPress={() => {
                setReplyingToPostId(undefined);
                setShowCommentModal(true);
              }}
            >
              <Text style={styles.commentInputPlaceholder}>Write a comment...</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comment Modal - Must be inside thread-detail view */}
        <Modal visible={showCommentModal} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Comment</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCommentModal(false);
                    setReplyingToPostId(undefined);
                  }}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={replyingToPostId ? "Write a reply..." : "Write a comment..."}
                  placeholderTextColor="#999"
                  value={commentContent}
                  onChangeText={setCommentContent}
                  multiline
                  numberOfLines={6}
                  color="#000"
                />
                {commentImages.map((url, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image source={{ uri: url }} style={styles.previewImage} />
                    <TouchableOpacity
                      onPress={() => setCommentImages(commentImages.filter((_, i) => i !== index))}
                      style={styles.removeImageButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
                <ImageUploadPicker
                  value=""
                  onChange={(url) => {
                    if (url) setCommentImages([...commentImages, url]);
                  }}
                  folder="social"
                />
                <TouchableOpacity
                  style={[styles.submitButton, createPostMutation.isPending && styles.submitButtonDisabled]}
                  onPress={handlePostComment}
                  disabled={createPostMutation.isPending}
                >
                  {createPostMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Post</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
        <Text style={styles.headerTitle}>Social Feed</Text>
        <TouchableOpacity onPress={() => setShowCreatePostModal(true)}>
          <Ionicons name="create-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={threadsData?.threads || []}
        renderItem={({ item }) => renderPost(item)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={isLoadingThreads} onRefresh={refetchThreads} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share something!</Text>
          </View>
        }
      />

      {/* Create Post Modal */}
      <Modal visible={showCreatePostModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setShowCreatePostModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.createPostHeader}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.createPostAvatar} />
                ) : (
                  <View style={styles.createPostAvatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#666" />
                  </View>
                )}
                <Text style={styles.createPostAuthorName}>{user?.full_name || user?.email || 'You'}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What's on your mind?"
                placeholderTextColor="#999"
                value={postContent}
                onChangeText={setPostContent}
                multiline
                numberOfLines={8}
                color="#000"
              />
              {postImages.map((url, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: url }} style={styles.previewImage} />
                  <TouchableOpacity
                    onPress={() => setPostImages(postImages.filter((_, i) => i !== index))}
                    style={styles.removeImageButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              <ImageUploadPicker
                value=""
                onChange={(url) => {
                  if (url) setPostImages([...postImages, url]);
                }}
                folder="social"
              />
              <TouchableOpacity
                style={[styles.submitButton, createThreadMutation.isPending && styles.submitButtonDisabled]}
                onPress={handleCreatePost}
                disabled={createThreadMutation.isPending}
              >
                {createThreadMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comment Modal */}
      <Modal visible={showCommentModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCommentModal(false);
                  setReplyingToPostId(undefined);
                }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={replyingToPostId ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor="#999"
                value={commentContent}
                onChangeText={setCommentContent}
                multiline
                numberOfLines={6}
                color="#000"
              />
              {commentImages.map((url, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: url }} style={styles.previewImage} />
                  <TouchableOpacity
                    onPress={() => setCommentImages(commentImages.filter((_, i) => i !== index))}
                    style={styles.removeImageButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              <ImageUploadPicker
                value=""
                onChange={(url) => {
                  if (url) setCommentImages([...commentImages, url]);
                }}
                folder="social"
              />
              <TouchableOpacity
                style={[styles.submitButton, createPostMutation.isPending && styles.submitButtonDisabled]}
                onPress={handlePostComment}
                disabled={createPostMutation.isPending}
              >
                {createPostMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Content</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={styles.input}
                placeholder="Reason for reporting"
                placeholderTextColor="#999"
                value={reportReason}
                onChangeText={setReportReason}
                color="#000"
              />
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details..."
                placeholderTextColor="#999"
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={4}
                color="#000"
              />
              <TouchableOpacity
                style={[styles.submitButton, reportContentMutation.isPending && styles.submitButtonDisabled]}
                onPress={handleSubmitReport}
                disabled={reportContentMutation.isPending}
              >
                {reportContentMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  feedContent: {
    padding: 12,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  postTime: {
    fontSize: 13,
    color: '#65676b',
    marginTop: 2,
  },
  postText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImagesContainer: {
    marginBottom: 12,
  },
  singleImage: {
    width: '100%',
    height: width - 64,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  multipleImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  multiImage: {
    width: (width - 80) / 2,
    height: (width - 80) / 2,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  moreImagesOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  productTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  productTagText: {
    fontSize: 13,
    color: '#1877f2',
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#65676b',
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#FF3B30',
  },
  commentsPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
  },
  commentPreview: {
    marginBottom: 8,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  commentPreviewText: {
    fontSize: 14,
    color: '#65676b',
    lineHeight: 18,
  },
  viewAllComments: {
    fontSize: 13,
    color: '#65676b',
    marginTop: 4,
  },
  viewCommentsButton: {
    marginTop: 8,
  },
  viewCommentsText: {
    fontSize: 13,
    color: '#65676b',
  },
  originalPost: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  commentsSection: {
    backgroundColor: '#fff',
    padding: 16,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  commentItem: {
    marginBottom: 16,
  },
  replyItem: {
    marginLeft: 40,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#f0f2f5',
    borderRadius: 18,
    padding: 12,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  commentImages: {
    marginTop: 8,
    gap: 8,
  },
  commentImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingLeft: 12,
  },
  commentTime: {
    fontSize: 12,
    color: '#65676b',
  },
  commentAction: {
    fontSize: 12,
    color: '#65676b',
    fontWeight: '500',
  },
  commentActionActive: {
    color: '#FF3B30',
  },
  deleteAction: {
    color: '#FF3B30',
  },
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 40,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  inputAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentInputButton: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentInputPlaceholder: {
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
  modalBody: {
    padding: 16,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  createPostAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  createPostAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  submitButton: {
    backgroundColor: '#1877f2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
