import api from '../config/api';

export interface DiscussionThread {
  id: string;
  product_id?: string;
  created_by: string;
  title: string;
  content: string;
  image_urls?: string[];
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  product?: {
    id: string;
    name: string;
    image_url?: string;
  };
  reaction_count?: number;
  post_count?: number;
  user_reaction?: string;
}

export interface DiscussionPost {
  id: string;
  thread_id: string;
  parent_post_id?: string;
  created_by: string;
  content: string;
  image_urls?: string[];
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  replies?: DiscussionPost[];
  reaction_count?: number;
  user_reaction?: string;
}

export interface CreateThreadParams {
  product_id?: string;
  title: string;
  content: string;
  image_urls?: string[];
}

export interface CreatePostParams {
  thread_id: string;
  parent_post_id?: string;
  content: string;
  image_urls?: string[];
}

export interface ReactionParams {
  content_type: 'thread' | 'post';
  content_id: string;
  reaction_type: 'like' | 'love' | 'helpful' | 'dislike';
}

/**
 * Get discussion threads
 */
export async function getThreads(
  productId?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ threads: DiscussionThread[]; total: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (productId) {
    params.append('product_id', productId);
  }
  const response = await api.get<{ threads: DiscussionThread[]; total: number }>(
    `/social/threads?${params.toString()}`
  );
  return response.data;
}

/**
 * Get a single thread with posts
 */
export async function getThread(
  threadId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ thread: DiscussionThread; posts: DiscussionPost[]; total: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await api.get<{ thread: DiscussionThread; posts: DiscussionPost[]; total: number }>(
    `/social/threads/${threadId}?${params.toString()}`
  );
  return response.data;
}

/**
 * Create a new discussion thread
 */
export async function createThread(params: CreateThreadParams): Promise<DiscussionThread> {
  const response = await api.post<{ thread: DiscussionThread }>('/social/threads', params);
  return response.data.thread;
}

/**
 * Update a discussion thread
 */
export async function updateThread(
  threadId: string,
  updates: Partial<CreateThreadParams>
): Promise<DiscussionThread> {
  const response = await api.put<{ thread: DiscussionThread }>(`/social/threads/${threadId}`, updates);
  return response.data.thread;
}

/**
 * Delete a discussion thread
 */
export async function deleteThread(threadId: string): Promise<void> {
  await api.delete(`/social/threads/${threadId}`);
}

/**
 * Create a post/comment
 */
export async function createPost(params: CreatePostParams): Promise<DiscussionPost> {
  const response = await api.post<{ post: DiscussionPost }>('/social/posts', params);
  return response.data.post;
}

/**
 * Update a post/comment
 */
export async function updatePost(
  postId: string,
  updates: { content?: string; image_urls?: string[] }
): Promise<DiscussionPost> {
  const response = await api.put<{ post: DiscussionPost }>(`/social/posts/${postId}`, updates);
  return response.data.post;
}

/**
 * Delete a post/comment
 */
export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/social/posts/${postId}`);
}

/**
 * Toggle reaction
 */
export async function toggleReaction(params: ReactionParams): Promise<void> {
  await api.post('/social/reactions', params);
}

/**
 * Report content
 */
export async function reportContent(
  contentType: 'thread' | 'post',
  contentId: string,
  reason: string,
  description?: string
): Promise<void> {
  await api.post('/social/reports', {
    content_type: contentType,
    content_id: contentId,
    reason,
    description,
  });
}

/**
 * Pin/unpin a thread (admin/vendor only)
 */
export async function pinThread(threadId: string, isPinned: boolean): Promise<void> {
  await api.post(`/social/threads/${threadId}/pin`, { is_pinned: isPinned });
}

/**
 * Lock/unlock a thread (admin/vendor only)
 */
export async function lockThread(threadId: string, isLocked: boolean): Promise<void> {
  await api.post(`/social/threads/${threadId}/lock`, { is_locked: isLocked });
}















