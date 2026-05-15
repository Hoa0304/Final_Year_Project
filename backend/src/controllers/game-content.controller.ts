import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get game content for a game instance
 */
export async function getGameContent(req: Request, res: Response) {
  try {
    const { gameInstanceId } = req.params;

    const { data: content, error } = await supabase
      .from('game_content')
      .select('*')
      .eq('game_instance_id', gameInstanceId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Get game content error:', error);
      return res.status(500).json({ error: 'Failed to fetch game content' });
    }

    res.json({ content: content || [] });
  } catch (error) {
    console.error('Get game content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add content item to game instance
 */
export async function addGameContent(req: AuthRequest, res: Response) {
  try {
    const { gameInstanceId } = req.params;
    const { content_type, content_data, order_index, metadata } = req.body;

    if (!content_type || !content_data) {
      return res.status(400).json({ error: 'Content type and content data are required' });
    }

    // Verify game instance exists and user has permission
    const { data: instance } = await supabase
      .from('game_instances')
      .select('created_by')
      .eq('id', gameInstanceId)
      .single();

    if (!instance) {
      return res.status(404).json({ error: 'Game instance not found' });
    }

    if (instance.created_by !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'You can only add content to your own games' });
    }

    // Get max order_index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const { data: lastContent } = await supabase
        .from('game_content')
        .select('order_index')
        .eq('game_instance_id', gameInstanceId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      finalOrderIndex = lastContent ? (lastContent.order_index || 0) + 1 : 0;
    }

    const { data: content, error } = await supabase
      .from('game_content')
      .insert({
        game_instance_id: gameInstanceId,
        content_type,
        content_data,
        order_index: finalOrderIndex,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Add game content error:', error);
      return res.status(500).json({ error: 'Failed to add game content' });
    }

    res.status(201).json({
      message: 'Game content added successfully',
      content,
    });
  } catch (error) {
    console.error('Add game content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update game content item
 */
export async function updateGameContent(req: AuthRequest, res: Response) {
  try {
    const { gameInstanceId, contentId } = req.params;
    const { content_type, content_data, order_index, metadata } = req.body;

    // Verify game instance exists and user has permission
    const { data: instance } = await supabase
      .from('game_instances')
      .select('created_by')
      .eq('id', gameInstanceId)
      .single();

    if (!instance) {
      return res.status(404).json({ error: 'Game instance not found' });
    }

    if (instance.created_by !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update content of your own games' });
    }

    const updateData: any = {};
    if (content_type !== undefined) updateData.content_type = content_type;
    if (content_data !== undefined) updateData.content_data = content_data;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: content, error } = await supabase
      .from('game_content')
      .update(updateData)
      .eq('id', contentId)
      .eq('game_instance_id', gameInstanceId)
      .select()
      .single();

    if (error || !content) {
      console.error('Update game content error:', error);
      return res.status(404).json({ error: 'Game content not found' });
    }

    res.json({
      message: 'Game content updated successfully',
      content,
    });
  } catch (error) {
    console.error('Update game content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete game content item
 */
export async function deleteGameContent(req: AuthRequest, res: Response) {
  try {
    const { gameInstanceId, contentId } = req.params;

    // Verify game instance exists and user has permission
    const { data: instance } = await supabase
      .from('game_instances')
      .select('created_by')
      .eq('id', gameInstanceId)
      .single();

    if (!instance) {
      return res.status(404).json({ error: 'Game instance not found' });
    }

    if (instance.created_by !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete content of your own games' });
    }

    const { error } = await supabase
      .from('game_content')
      .delete()
      .eq('id', contentId)
      .eq('game_instance_id', gameInstanceId);

    if (error) {
      console.error('Delete game content error:', error);
      return res.status(500).json({ error: 'Failed to delete game content' });
    }

    res.json({ message: 'Game content deleted successfully' });
  } catch (error) {
    console.error('Delete game content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Reorder game content items
 */
export async function reorderGameContent(req: AuthRequest, res: Response) {
  try {
    const { gameInstanceId } = req.params;
    const { contentIds } = req.body; // Array of content IDs in new order

    if (!Array.isArray(contentIds)) {
      return res.status(400).json({ error: 'contentIds must be an array' });
    }

    // Verify game instance exists and user has permission
    const { data: instance } = await supabase
      .from('game_instances')
      .select('created_by')
      .eq('id', gameInstanceId)
      .single();

    if (!instance) {
      return res.status(404).json({ error: 'Game instance not found' });
    }

    if (instance.created_by !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'You can only reorder content of your own games' });
    }

    // Update order_index for each content item
    const updates = contentIds.map((contentId: string, index: number) =>
      supabase
        .from('game_content')
        .update({ order_index: index })
        .eq('id', contentId)
        .eq('game_instance_id', gameInstanceId)
    );

    await Promise.all(updates);

    res.json({ message: 'Game content reordered successfully' });
  } catch (error) {
    console.error('Reorder game content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}







