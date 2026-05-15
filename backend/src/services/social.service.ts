/**
 * Social Discussion Service
 * Handles discussion threads, posts, comments, reactions, and moderation
 */

import { supabase } from '../utils/supabase';

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
  // Joined data
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
  // Joined data
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
 * Get discussion threads with pagination
 */
export async function getThreads(
  productId?: string,
  page: number = 1,
  limit: number = 20,
  userId?: string
): Promise<{ threads: DiscussionThread[]; total: number }> {
  let query = supabase
    .from('discussion_threads')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch threads: ${error.message}`);
  }

  // Fetch author and product info, reactions
  const threads = await Promise.all(
    (data || []).map(async (thread) => {
      const [authorData, productData, reactionsData, postsCount] = await Promise.all([
        thread.created_by
          ? supabase.from('users').select('id, full_name, email, avatar_url').eq('id', thread.created_by).single()
          : Promise.resolve({ data: null, error: null }),
        thread.product_id
          ? supabase.from('products').select('id, name, image_url').eq('id', thread.product_id).single()
          : Promise.resolve({ data: null }),
        userId
          ? supabase
              .from('thread_reactions')
              .select('reaction_type')
              .eq('thread_id', thread.id)
              .eq('user_id', userId)
              .single()
          : Promise.resolve({ data: null }),
        supabase
          .from('discussion_posts')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .eq('is_deleted', false),
      ]);

      const reactionCount = await supabase
        .from('thread_reactions')
        .select('id', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      return {
        ...thread,
        author: authorData.data ? {
          id: authorData.data.id,
          full_name: authorData.data.full_name || null,
          email: authorData.data.email || null,
          avatar_url: authorData.data.avatar_url || null,
        } : undefined,
        product: productData.data || undefined,
        reaction_count: reactionCount.count || 0,
        post_count: postsCount.count || 0,
        user_reaction: reactionsData.data?.reaction_type || undefined,
      };
    })
  );

  return {
    threads: threads as DiscussionThread[],
    total: count || 0,
  };
}

/**
 * Get a single thread with posts
 */
export async function getThread(
  threadId: string,
  userId?: string,
  page: number = 1,
  limit: number = 50
): Promise<{ thread: DiscussionThread; posts: DiscussionPost[]; total: number }> {
  // Get thread
  const { data: thread, error: threadError } = await supabase
    .from('discussion_threads')
    .select('*')
    .eq('id', threadId)
    .eq('is_deleted', false)
    .single();

  if (threadError || !thread) {
    throw new Error('Thread not found');
  }

  // Get author and product info
  const [authorData, productData, reactionsData] = await Promise.all([
    supabase.from('users').select('id, full_name, email, avatar_url').eq('id', thread.created_by).single(),
    thread.product_id
      ? supabase.from('products').select('id, name, image_url').eq('id', thread.product_id).single()
      : Promise.resolve({ data: null }),
    userId
      ? supabase
          .from('thread_reactions')
          .select('reaction_type')
          .eq('thread_id', thread.id)
          .eq('user_id', userId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const reactionCount = await supabase
    .from('thread_reactions')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', thread.id);

  const postsCount = await supabase
    .from('discussion_posts')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', thread.id)
    .eq('is_deleted', false);

  const threadWithData: DiscussionThread = {
    ...thread,
    author: authorData.data ? {
      id: authorData.data.id,
      full_name: authorData.data.full_name || null,
      email: authorData.data.email || null,
      avatar_url: authorData.data.avatar_url || null,
    } : undefined,
    product: productData.data || undefined,
    reaction_count: reactionCount.count || 0,
    post_count: postsCount.count || 0,
    user_reaction: reactionsData.data?.reaction_type || undefined,
  };

  // Get posts (top-level only, paginated)
  const { data: posts, error: postsError, count } = await supabase
    .from('discussion_posts')
    .select('*', { count: 'exact' })
    .eq('thread_id', threadId)
    .is('parent_post_id', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (postsError) {
    throw new Error(`Failed to fetch posts: ${postsError.message}`);
  }

      // Fetch author info and replies for each post
      const postsWithData = await Promise.all(
        (posts || []).map(async (post) => {
          const [authorData, reactionsData, repliesData] = await Promise.all([
            post.created_by
              ? supabase.from('users').select('id, full_name, email, avatar_url').eq('id', post.created_by).single()
              : Promise.resolve({ data: null, error: null }),
        userId
          ? supabase
              .from('post_reactions')
              .select('reaction_type')
              .eq('post_id', post.id)
              .eq('user_id', userId)
              .single()
          : Promise.resolve({ data: null }),
        supabase
          .from('discussion_posts')
          .select('*')
          .eq('parent_post_id', post.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true }),
      ]);

      const reactionCount = await supabase
        .from('post_reactions')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', post.id);

      // Get replies with author info
      const replies = await Promise.all(
        (repliesData.data || []).map(async (reply) => {
          const [replyAuthorData, replyReactionsData] = await Promise.all([
            supabase.from('users').select('id, full_name, email, avatar_url').eq('id', reply.created_by).single(),
            userId
              ? supabase
                  .from('post_reactions')
                  .select('reaction_type')
                  .eq('post_id', reply.id)
                  .eq('user_id', userId)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          const replyReactionCount = await supabase
            .from('post_reactions')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', reply.id);

          return {
            ...reply,
            author: replyAuthorData.data ? {
              id: replyAuthorData.data.id,
              full_name: replyAuthorData.data.full_name || null,
              email: replyAuthorData.data.email || null,
              avatar_url: replyAuthorData.data.avatar_url || null,
            } : undefined,
            reaction_count: replyReactionCount.count || 0,
            user_reaction: replyReactionsData.data?.reaction_type || undefined,
          };
        })
      );

      return {
        ...post,
        author: authorData.data ? {
          id: authorData.data.id,
          full_name: authorData.data.full_name || null,
          email: authorData.data.email || null,
          avatar_url: authorData.data.avatar_url || null,
        } : undefined,
        replies: replies as DiscussionPost[],
        reaction_count: reactionCount.count || 0,
        user_reaction: reactionsData.data?.reaction_type || undefined,
      };
    })
  );

  return {
    thread: threadWithData,
    posts: postsWithData as DiscussionPost[],
    total: count || 0,
  };
}

/**
 * Create a new discussion thread
 */
export async function createThread(userId: string, params: CreateThreadParams): Promise<DiscussionThread> {
  const { data, error } = await supabase
    .from('discussion_threads')
    .insert({
      product_id: params.product_id || null,
      created_by: userId,
      title: params.title,
      content: params.content,
      image_urls: params.image_urls || [],
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  // Fetch author info
  const { data: authorData } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .single();

  return {
    ...data,
    author: authorData || undefined,
    reaction_count: 0,
    post_count: 0,
  } as DiscussionThread;
}

/**
 * Update a discussion thread
 */
export async function updateThread(
  threadId: string,
  userId: string,
  updates: Partial<CreateThreadParams>
): Promise<DiscussionThread> {
  const { data, error } = await supabase
    .from('discussion_threads')
    .update({
      title: updates.title,
      content: updates.content,
      image_urls: updates.image_urls,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)
    .eq('created_by', userId)
    .eq('is_deleted', false)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update thread: ${error.message}`);
  }

  return data as DiscussionThread;
}

/**
 * Delete a discussion thread (soft delete)
 */
export async function deleteThread(threadId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('discussion_threads')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', threadId)
    .eq('created_by', userId);

  if (error) {
    throw new Error(`Failed to delete thread: ${error.message}`);
  }
}

/**
 * Create a post/comment
 */
export async function createPost(userId: string, params: CreatePostParams): Promise<DiscussionPost> {
  const { data, error } = await supabase
    .from('discussion_posts')
    .insert({
      thread_id: params.thread_id,
      parent_post_id: params.parent_post_id || null,
      created_by: userId,
      content: params.content,
      image_urls: params.image_urls || [],
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  // Fetch author info
  const { data: authorData } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .single();

  return {
    ...data,
    author: authorData || undefined,
    reaction_count: 0,
  } as DiscussionPost;
}

/**
 * Update a post/comment
 */
export async function updatePost(
  postId: string,
  userId: string,
  updates: { content?: string; image_urls?: string[] }
): Promise<DiscussionPost> {
  const { data, error } = await supabase
    .from('discussion_posts')
    .update({
      content: updates.content,
      image_urls: updates.image_urls,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('created_by', userId)
    .eq('is_deleted', false)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }

  return data as DiscussionPost;
}

/**
 * Delete a post/comment (soft delete)
 */
export async function deletePost(postId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('discussion_posts')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('created_by', userId);

  if (error) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }
}

/**
 * Add or update a reaction
 */
export async function toggleReaction(userId: string, params: ReactionParams): Promise<void> {
  const tableName = params.content_type === 'thread' ? 'thread_reactions' : 'post_reactions';
  const idField = params.content_type === 'thread' ? 'thread_id' : 'post_id';

  // Check if reaction exists
  const { data: existing } = await supabase
    .from(tableName)
    .select('id, reaction_type')
    .eq(idField, params.content_id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.reaction_type === params.reaction_type) {
      // Remove reaction if same type
      await supabase.from(tableName).delete().eq('id', existing.id);
    } else {
      // Update reaction type
      await supabase
        .from(tableName)
        .update({ reaction_type: params.reaction_type })
        .eq('id', existing.id);
    }
  } else {
    // Create new reaction
    await supabase.from(tableName).insert({
      [idField]: params.content_id,
      user_id: userId,
      reaction_type: params.reaction_type,
    });
  }
}

/**
 * Report content
 */
export async function reportContent(
  userId: string,
  contentType: 'thread' | 'post',
  contentId: string,
  reason: string,
  description?: string
): Promise<void> {
  const { error } = await supabase.from('content_reports').insert({
    reported_by: userId,
    content_type: contentType,
    content_id: contentId,
    reason,
    description,
  });

  if (error) {
    throw new Error(`Failed to report content: ${error.message}`);
  }
}

/**
 * Pin/unpin a thread (admin/vendor only)
 */
export async function pinThread(threadId: string, isPinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('discussion_threads')
    .update({ is_pinned: isPinned })
    .eq('id', threadId);

  if (error) {
    throw new Error(`Failed to pin thread: ${error.message}`);
  }
}

/**
 * Lock/unlock a thread (admin/vendor only)
 */
export async function lockThread(threadId: string, isLocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('discussion_threads')
    .update({ is_locked: isLocked })
    .eq('id', threadId);

  if (error) {
    throw new Error(`Failed to lock thread: ${error.message}`);
  }
}

