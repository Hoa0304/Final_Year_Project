import api from '../config/api';

export interface GameTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  icon_url?: string;
  config_schema: any;
  default_config: any;
  ui_config?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameInstance {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  config: any;
  reward_amount: number;
  max_plays_per_day: number;
  difficulty_level?: string;
  estimated_duration?: number;
  category?: string;
  tags?: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  game_templates?: GameTemplate;
  content?: GameContent[];
  assets?: GameAsset[];
}

export interface GameContent {
  id: string;
  game_instance_id: string;
  content_type: string;
  content_data: any;
  order_index: number;
  metadata?: any;
  created_at: string;
}

export interface GameAsset {
  id: string;
  game_instance_id: string;
  asset_type: string;
  asset_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  metadata?: any;
  created_at: string;
}

// Game Templates
export async function getGameTemplates(): Promise<GameTemplate[]> {
  const response = await api.get<{ templates: GameTemplate[] }>('/admin/game-templates');
  return response.data.templates;
}

export async function getGameTemplateById(id: string): Promise<GameTemplate> {
  const response = await api.get<{ template: GameTemplate }>(`/admin/game-templates/${id}`);
  return response.data.template;
}

// Game Instances
export async function getGameInstances(params?: {
  is_active?: boolean;
  template_id?: string;
  created_by?: string;
}): Promise<GameInstance[]> {
  const response = await api.get<{ instances: GameInstance[] }>('/admin/game-instances', { params });
  return response.data.instances;
}

export async function getGameInstanceById(id: string): Promise<GameInstance> {
  const response = await api.get<{ instance: GameInstance }>(`/admin/game-instances/${id}`);
  return response.data.instance;
}

export async function createGameInstance(data: {
  template_id: string;
  name: string;
  description?: string;
  config: any;
  reward_amount?: number;
  max_plays_per_day?: number;
  difficulty_level?: string;
  estimated_duration?: number;
  category?: string;
  tags?: string[];
}): Promise<GameInstance> {
  const response = await api.post<{ instance: GameInstance; message: string }>(
    '/admin/game-instances',
    data
  );
  return response.data.instance;
}

export async function updateGameInstance(
  id: string,
  data: Partial<GameInstance>
): Promise<GameInstance> {
  const response = await api.put<{ instance: GameInstance; message: string }>(
    `/admin/game-instances/${id}`,
    data
  );
  return response.data.instance;
}

export async function deleteGameInstance(id: string): Promise<void> {
  await api.delete(`/admin/game-instances/${id}`);
}

export async function validateGameConfig(template_id: string, config: any): Promise<{
  isValid: boolean;
  errors?: string[];
}> {
  const response = await api.post<{ isValid: boolean; errors?: string[] }>(
    '/admin/game-instances/validate',
    { template_id, config }
  );
  return response.data;
}

// Game Content
export async function getGameContent(gameInstanceId: string): Promise<GameContent[]> {
  const response = await api.get<{ content: GameContent[] }>(
    `/admin/game-content/${gameInstanceId}`
  );
  return response.data.content;
}

export async function addGameContent(
  gameInstanceId: string,
  data: {
    content_type: string;
    content_data: any;
    order_index?: number;
    metadata?: any;
  }
): Promise<GameContent> {
  const response = await api.post<{ content: GameContent; message: string }>(
    `/admin/game-content/${gameInstanceId}`,
    data
  );
  return response.data.content;
}

export async function updateGameContent(
  gameInstanceId: string,
  contentId: string,
  data: Partial<GameContent>
): Promise<GameContent> {
  const response = await api.put<{ content: GameContent; message: string }>(
    `/admin/game-content/${gameInstanceId}/${contentId}`,
    data
  );
  return response.data.content;
}

export async function deleteGameContent(gameInstanceId: string, contentId: string): Promise<void> {
  await api.delete(`/admin/game-content/${gameInstanceId}/${contentId}`);
}







