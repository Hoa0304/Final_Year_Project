/**
 * Social Discussion Controller
 * Handles API requests for discussion threads, posts, comments, and moderation
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../utils/supabase';
import * as socialService from '../services/social.service';
import { sendNotification } from '../services/notification.service';

/**
 * Get discussion threads
 */
export async function getThreads(req: AuthRequest, res: Response) {
  try {
    const { product_id, page = '1', limit = '20' } = req.query;
    const userId = req.user!.userId;

    const threads = await socialService.getThreads(
      product_id as string | undefined,
      parseInt(page as string),
      parseInt(limit as string),
      userId
    );

    res.json(threads);
  } catch (error: any) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch threads' });
  }
}

/**
 * Get a single thread with posts
 */
export async function getThread(req: AuthRequest, res: Response) {
  try {
    const { threadId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const userId = req.user!.userId;

    const result = await socialService.getThread(
      threadId,
      userId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(result);
  } catch (error: any) {
    console.error('Get thread error:', error);
    if (error.message === 'Thread not found') {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch thread' });
  }
}

/**
 * Create a new discussion thread
 */
export async function createThread(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { product_id, title, content, image_urls } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const thread = await socialService.createThread(userId, {
      product_id,
      title,
      content,
      image_urls,
    });

    res.status(201).json({ thread });
  } catch (error: any) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to create thread' });
  }
}

/**
 * Update a discussion thread
 */
export async function updateThread(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { threadId } = req.params;
    const { title, content, image_urls } = req.body;

    const thread = await socialService.updateThread(threadId, userId, {
      title,
      content,
      image_urls,
    });

    res.json({ thread });
  } catch (error: any) {
    console.error('Update thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to update thread' });
  }
}

/**
 * Delete a discussion thread
 */
export async function deleteThread(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { threadId } = req.params;

    await socialService.deleteThread(threadId, userId);

    res.json({ message: 'Thread deleted successfully' });
  } catch (error: any) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete thread' });
  }
}

/**
 * Create a post/comment
 */
export async function createPost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { thread_id, parent_post_id, content, image_urls } = req.body;

    if (!thread_id || !content) {
      return res.status(400).json({ error: 'Thread ID and content are required' });
    }

    // Check if thread is locked
    const { data: thread } = await supabase
      .from('discussion_threads')
      .select('is_locked, created_by')
      .eq('id', thread_id)
      .single();

    if (thread?.is_locked && thread.created_by !== userId && req.user!.role !== 'admin' && req.user!.role !== 'vendor') {
      return res.status(403).json({ error: 'Thread is locked' });
    }

    const post = await socialService.createPost(userId, {
      thread_id,
      parent_post_id,
      content,
      image_urls,
    });

    // Notify thread author if someone replies (not the author themselves)
    if (parent_post_id) {
      // Reply to a post - notify post author
      const { data: parentPost } = await supabase
        .from('discussion_posts')
        .select('created_by')
        .eq('id', parent_post_id)
        .single();

      if (parentPost && parentPost.created_by !== userId) {
        await sendNotification(parentPost.created_by, {
          type: 'social_reply',
          title: 'New Reply to Your Post',
          message: `${req.user!.email} replied to your post`,
          priority: 'medium',
          data: {
            reference_type: 'discussion_post',
            reference_id: post.id,
          },
        });
      }
    } else {
      // Reply to thread - notify thread author
      if (thread && thread.created_by !== userId) {
        await sendNotification(thread.created_by, {
          type: 'social_reply',
          title: 'New Reply to Your Thread',
          message: `${req.user!.email} replied to your thread`,
          priority: 'medium',
          data: {
            reference_type: 'discussion_thread',
            reference_id: thread_id,
          },
        });
      }
    }

    res.status(201).json({ post });
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message || 'Failed to create post' });
  }
}

/**
 * Update a post/comment
 */
export async function updatePost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { postId } = req.params;
    const { content, image_urls } = req.body;

    const post = await socialService.updatePost(postId, userId, {
      content,
      image_urls,
    });

    res.json({ post });
  } catch (error: any) {
    console.error('Update post error:', error);
    res.status(500).json({ error: error.message || 'Failed to update post' });
  }
}

/**
 * Delete a post/comment
 */
export async function deletePost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { postId } = req.params;

    await socialService.deletePost(postId, userId);

    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
}

/**
 * Toggle reaction (like, love, helpful, dislike)
 */
export async function toggleReaction(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { content_type, content_id, reaction_type } = req.body;

    if (!content_type || !content_id || !reaction_type) {
      return res.status(400).json({ error: 'Content type, content ID, and reaction type are required' });
    }

    await socialService.toggleReaction(userId, {
      content_type,
      content_id,
      reaction_type,
    });

    res.json({ message: 'Reaction toggled successfully' });
  } catch (error: any) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle reaction' });
  }
}

/**
 * Report content
 */
export async function reportContent(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { content_type, content_id, reason, description } = req.body;

    if (!content_type || !content_id || !reason) {
      return res.status(400).json({ error: 'Content type, content ID, and reason are required' });
    }

    await socialService.reportContent(userId, content_type, content_id, reason, description);

    res.status(201).json({ message: 'Content reported successfully' });
  } catch (error: any) {
    console.error('Report content error:', error);
    res.status(500).json({ error: error.message || 'Failed to report content' });
  }
}

/**
 * Pin/unpin a thread (admin/vendor only)
 */
export async function pinThread(req: AuthRequest, res: Response) {
  try {
    const { threadId } = req.params;
    const { is_pinned } = req.body;

    if (req.user!.role !== 'admin' && req.user!.role !== 'vendor') {
      return res.status(403).json({ error: 'Only admins and vendors can pin threads' });
    }

    await socialService.pinThread(threadId, is_pinned);

    res.json({ message: `Thread ${is_pinned ? 'pinned' : 'unpinned'} successfully` });
  } catch (error: any) {
    console.error('Pin thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to pin thread' });
  }
}

/**
 * Lock/unlock a thread (admin/vendor only)
 */
export async function lockThread(req: AuthRequest, res: Response) {
  try {
    const { threadId } = req.params;
    const { is_locked } = req.body;

    if (req.user!.role !== 'admin' && req.user!.role !== 'vendor') {
      return res.status(403).json({ error: 'Only admins and vendors can lock threads' });
    }

    await socialService.lockThread(threadId, is_locked);

    res.json({ message: `Thread ${is_locked ? 'locked' : 'unlocked'} successfully` });
  } catch (error: any) {
    console.error('Lock thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to lock thread' });
  }
}

