import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { validateGameConfig } from '../services/game-engine.service';

/**
 * Get all game instances (Admin only)
 */
export async function getGameInstances(req: AuthRequest, res: Response) {
  try {
    const { is_active, template_id, created_by } = req.query;

    let query = supabase
      .from('game_instances')
      .select(`
        *,
        game_templates (
          id,
          name,
          type,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }
    if (template_id) {
      query = query.eq('template_id', template_id);
    }
    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    const { data: instances, error } = await query;

    if (error) {
      console.error('Get game instances error:', error);
      return res.status(500).json({ error: 'Failed to fetch game instances' });
    }

    res.json({ instances });
  } catch (error) {
    console.error('Get game instances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get game instance by ID (Admin only)
 */
export async function getGameInstanceById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const { data: instance, error } = await supabase
      .from('game_instances')
      .select(`
        *,
        game_templates (
          id,
          name,
          type,
          description,
          config_schema,
          default_config
        )
      `)
      .eq('id', id)
      .single();

    if (error || !instance) {
      return res.status(404).json({ error: 'Game instance not found' });
    }

    // Get game content
    const { data: content } = await supabase
      .from('game_content')
      .select('*')
      .eq('game_instance_id', id)
      .order('order_index', { ascending: true });

    // Get game assets
    const { data: assets } = await supabase
      .from('game_assets')
      .select('*')
      .eq('game_instance_id', id);

    res.json({
      instance: {
        ...instance,
        content: content || [],
        assets: assets || [],
      },
    });
  } catch (error) {
    console.error('Get game instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create game instance
 */
export async function createGameInstance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const {
      template_id,
      name,
      description,
      config,
      reward_amount,
      max_plays_per_day,
      difficulty_level,
      estimated_duration,
      category,
      tags,
    } = req.body;

    if (!template_id || !name || !config) {
      return res.status(400).json({ error: 'Template ID, name, and config are required' });
    }

    // Get template to validate config
    const { data: template, error: templateError } = await supabase
      .from('game_templates')
      .select('config_schema, default_config')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Game template not found' });
    }

    // Validate config against schema
    const validation = validateGameConfig(config, template.config_schema);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid game configuration',
        details: validation.errors,
      });
    }

    const { data: instance, error } = await supabase
      .from('game_instances')
      .insert({
        template_id,
        name,
        description: description || null,
        config,
        reward_amount: reward_amount || 0,
        max_plays_per_day: max_plays_per_day || 10,
        difficulty_level: difficulty_level || null,
        estimated_duration: estimated_duration || null,
        category: category || null,
        tags: tags || [],
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Create game instance error:', error);
      return res.status(500).json({ error: 'Failed to create game instance' });
    }

    res.status(201).json({
      message: 'Game instance created successfully',
      instance,
    });
  } catch (error) {
    console.error('Create game instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update game instance
 */
export async function updateGameInstance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const {
      name,
      description,
      config,
      reward_amount,
      max_plays_per_day,
      difficulty_level,
      estimated_duration,
      category,
      tags,
      is_active,
    } = req.body;

    // Check if user owns this game instance or is admin
    const { data: existingInstance } = await supabase
      .from('game_instances')
      .select('created_by, template_id')
      .eq('id', id)
      .single();

    if (!existingInstance) {
      return res.status(404).json({ error: 'Game instance not found' });
    }

    // Only admin can update games they didn't create
    if (existingInstance.created_by !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own games' });
    }

    // If config is being updated, validate it
    if (config) {
      const { data: template } = await supabase
        .from('game_templates')
        .select('config_schema')
        .eq('id', existingInstance.template_id)
        .single();

      if (template) {
        const validation = validateGameConfig(config, template.config_schema);
        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Invalid game configuration',
            details: validation.errors,
          });
        }
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (config !== undefined) updateData.config = config;
    if (reward_amount !== undefined) updateData.reward_amount = reward_amount;
    if (max_plays_per_day !== undefined) updateData.max_plays_per_day = max_plays_per_day;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: instance, error } = await supabase
      .from('game_instances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !instance) {
      console.error('Update game instance error:', error);
      return res.status(500).json({ error: 'Failed to update game instance' });
    }

    res.json({
      message: 'Game instance updated successfully',
      instance,
    });
  } catch (error) {
    console.error('Update game instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete game instance
 */
export async function deleteGameInstance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if user owns this game instance or is admin
    const { data: instance } = await supabase
      .from('game_instances')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!instance) {
      return res.status(404).json({ error: 'Game instance not found' });
    }

    if (instance.created_by !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own games' });
    }

    const { error } = await supabase.from('game_instances').delete().eq('id', id);

    if (error) {
      console.error('Delete game instance error:', error);
      return res.status(500).json({ error: 'Failed to delete game instance' });
    }

    res.json({ message: 'Game instance deleted successfully' });
  } catch (error) {
    console.error('Delete game instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Validate game configuration
 */
export async function validateGameInstanceConfig(req: Request, res: Response) {
  try {
    const { template_id, config } = req.body;

    if (!template_id || !config) {
      return res.status(400).json({ error: 'Template ID and config are required' });
    }

    const { data: template, error } = await supabase
      .from('game_templates')
      .select('config_schema')
      .eq('id', template_id)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Game template not found' });
    }

    const validation = validateGameConfig(config, template.config_schema);

    res.json({
      isValid: validation.isValid,
      errors: validation.errors || [],
    });
  } catch (error) {
    console.error('Validate game config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}







