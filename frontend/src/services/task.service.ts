import api from '../config/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  reward_amount: number;
  is_active: boolean;
  userStatus?: 'pending' | 'completed' | 'claimed';
  created_at: string;
  canComplete?: boolean; // Whether task requirements are met
  actionType?: 'marketplace' | 'games' | 'stocks' | 'tasks' | null; // Where to navigate for "Do it" button
}

export interface TasksResponse {
  tasks: Task[];
}

export interface CompleteTaskResponse {
  message: string;
  reward: number;
  task: {
    id: string;
    title: string;
    status: string;
  };
}

/**
 * Get all tasks
 */
export async function getTasks(): Promise<Task[]> {
  const response = await api.get<TasksResponse>('/tasks');
  return response.data.tasks;
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<Task> {
  const response = await api.get<{ task: Task }>(`/tasks/${id}`);
  return response.data.task;
}

/**
 * Complete a task
 * React Query v5 passes the entire mutation variables object as the first parameter
 * If called with mutate(taskId), it will receive taskId as string
 * If called with mutate({ taskId }), it will receive { taskId } as object
 */
export async function completeTask(taskIdOrVariables: string | { taskId: string }): Promise<CompleteTaskResponse> {
  const taskId = typeof taskIdOrVariables === 'string' ? taskIdOrVariables : taskIdOrVariables.taskId;
  const response = await api.post<CompleteTaskResponse>(`/tasks/${taskId}/complete`);
  return response.data;
}

