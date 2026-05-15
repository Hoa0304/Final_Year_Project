import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get all game templates
 */
export async function getGameTemplates(req: Request, res: Response) {
  try {
    const { data: templates, error } = await supabase
      .from('game_templates')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Get game templates error:', error);
      return res.status(500).json({ error: 'Failed to fetch game templates' });
    }

    res.json({ templates });
  } catch (error) {
    console.error('Get game templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get game template by ID
 */
export async function getGameTemplateById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { data: template, error } = await supabase
      .from('game_templates')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Game template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get game template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create game template (admin only)
 */
export async function createGameTemplate(req: AuthRequest, res: Response) {
  try {
    const { name, type, description, icon_url, config_schema, default_config, ui_config } = req.body;

    if (!name || !type || !config_schema || !default_config) {
      return res.status(400).json({ error: 'Name, type, config_schema, and default_config are required' });
    }

    const { data: template, error } = await supabase
      .from('game_templates')
      .insert({
        name,
        type,
        description: description || null,
        icon_url: icon_url || null,
        config_schema,
        default_config,
        ui_config: ui_config || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Create game template error:', error);
      return res.status(500).json({ error: 'Failed to create game template' });
    }

    res.status(201).json({
      message: 'Game template created successfully',
      template,
    });
  } catch (error) {
    console.error('Create game template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update game template (admin only)
 */
export async function updateGameTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, type, description, icon_url, config_schema, default_config, ui_config, is_active } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (icon_url !== undefined) updateData.icon_url = icon_url;
    if (config_schema !== undefined) updateData.config_schema = config_schema;
    if (default_config !== undefined) updateData.default_config = default_config;
    if (ui_config !== undefined) updateData.ui_config = ui_config;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: template, error } = await supabase
      .from('game_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !template) {
      console.error('Update game template error:', error);
      return res.status(404).json({ error: 'Game template not found' });
    }

    res.json({
      message: 'Game template updated successfully',
      template,
    });
  } catch (error) {
    console.error('Update game template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete game template (admin only)
 */
export async function deleteGameTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Check if any game instances are using this template
    const { count, error: countError } = await supabase
      .from('game_instances')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id);

    if (countError) {
      console.error('Check game instances error:', countError);
      return res.status(500).json({ error: 'Failed to check game instances' });
    }

    if (count && count > 0) {
      return res.status(400).json({
        error: `Cannot delete template. ${count} game instance(s) are using this template.`,
      });
    }

    const { error } = await supabase.from('game_templates').delete().eq('id', id);

    if (error) {
      console.error('Delete game template error:', error);
      return res.status(500).json({ error: 'Failed to delete game template' });
    }

    res.json({ message: 'Game template deleted successfully' });
  } catch (error) {
    console.error('Delete game template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}







