import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createTransaction } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';


/**
 * Get action type and navigation target based on task title/description
 */
function getTaskActionType(taskTitle: string, taskDescription?: string | null): {
  actionType: 'marketplace' | 'games' | 'stocks' | 'tasks' | null;
  canComplete: boolean;
} {
  const titleLower = taskTitle.toLowerCase().trim();
  const descLower = (taskDescription || '').toLowerCase().trim();
  const combined = `${titleLower} ${descLower}`.trim();

  console.log(`[getTaskActionType] Checking: title="${taskTitle}", combined="${combined}"`);

  // Check for marketplace/purchase related tasks
  // Match: "First Purchase", "Buy Product", "Purchase Item", etc.
  if (
    titleLower.includes('purchase') || 
    titleLower.includes('buy') ||
    titleLower.includes('shop') ||
    combined.includes('purchase') || 
    combined.includes('buy') || 
    combined.includes('shop') ||
    combined.includes('marketplace')
  ) {
    console.log(`[getTaskActionType] Matched MARKETPLACE for: "${taskTitle}"`);
    return { actionType: 'marketplace', canComplete: false };
  }



  // Check for task completion related tasks
  // Match: "Task Master", "Complete 3 Tasks", etc.
  if (
    titleLower.includes('task master') ||
    titleLower.includes('complete task') ||
    (combined.includes('complete') && combined.includes('task'))
  ) {
    console.log(`[getTaskActionType] Matched TASKS for: "${taskTitle}"`);
    return { actionType: 'tasks', canComplete: false };
  }

  // Default: no specific action type (task can be completed directly)
  console.log(`[getTaskActionType] No match for: "${taskTitle}", returning null`);
  return { actionType: null, canComplete: true };
}

/**
 * Get all active tasks
 * Includes user's completion status and validation status if authenticated
 */
export async function getTasks(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user?.userId;
    console.log(`[getTasks] Called, userId: ${userId ? userId : 'NOT AUTHENTICATED'}`);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get tasks error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }

    console.log(`[getTasks] Found ${tasks?.length || 0} tasks`);

    // If user is authenticated, get their task completion status and validation
    if (userId) {
      console.log(`[getTasks] User authenticated, processing tasks with validation...`);
      const { data: userTasks } = await supabase
        .from('user_tasks')
        .select('task_id, status')
        .eq('user_id', userId);

      const taskStatusMap = new Map(
        userTasks?.map(ut => [ut.task_id, ut.status]) || []
      );

      // Check validation for each task
      const tasksWithStatus = await Promise.all(
        tasks.map(async (task) => {
          const userStatus = taskStatusMap.get(task.id) || 'pending';
          const isCompleted = userStatus === 'completed' || userStatus === 'claimed';
          
          // Get action type first (always determine what action is needed)
          const { actionType: determinedActionType } = getTaskActionType(task.title, task.description);
          
          // If already completed, can complete is true, no action needed
          if (isCompleted) {
            return {
              ...task,
              userStatus,
              canComplete: true,
              actionType: null, // No action needed if completed
            };
          }

          // Check if requirements are met
          const validation = await validateTaskRequirements(
            userId,
            task.title,
            task.description,
            task.created_at,
            task.validation_rule
          );

          // Debug log
          console.log(`[TASK DEBUG] Task: "${task.title}", validation.isValid: ${validation.isValid}, determinedActionType: ${determinedActionType}`);

          const result = {
            ...task,
            userStatus,
            canComplete: validation.isValid,
            // Show action type if validation failed AND we have a determined action type
            // If no action type determined (null), it means task doesn't require specific action
            // Ensure we return null instead of undefined
            actionType: validation.isValid ? null : (determinedActionType ?? null),
          };

          console.log(`[TASK RESULT] Task: "${task.title}", actionType in result: ${result.actionType}, canComplete: ${result.canComplete}`);
          
          return result;
        })
      );

      console.log(`[TASKS RESPONSE] Returning ${tasksWithStatus.length} tasks with status`);
      return res.json({ tasks: tasksWithStatus });
    }

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get task by ID
 */
export async function getTaskById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get user's task status if authenticated
    if (userId) {
      const { data: userTask } = await supabase
        .from('user_tasks')
        .select('status')
        .eq('user_id', userId)
        .eq('task_id', id)
        .single();

      return res.json({
        task: {
          ...task,
          userStatus: userTask?.status || 'pending'
        }
      });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Validate task requirements based on validation_rule or task title/description
 * Only counts actions performed AFTER the task was created
 * Returns { isValid: boolean, message?: string }
 */
async function validateTaskRequirements(
  userId: string,
  taskTitle: string,
  taskDescription: string | null | undefined,
  taskCreatedAt: string,
  validationRule: any | null | undefined = null
): Promise<{ isValid: boolean; message?: string }> {
  // If validation rule is provided, use it instead of pattern matching
  if (validationRule && validationRule.type) {
    return await validateTaskByRule(userId, validationRule, taskCreatedAt);
  }

  // Fallback to pattern matching from title/description
  const titleLower = taskTitle.toLowerCase();
  const descLower = (taskDescription || '').toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  // Check for "buy" or "purchase" product requirement
  if (combined.includes('buy') || combined.includes('purchase') || combined.includes('shop')) {
    // Extract product name/keyword from task (e.g., "buy laptop" -> "laptop", "purchase iPhone" -> "iphone")
    // Remove common words: buy, purchase, shop, a, an, the, product, item, products, items
    const productKeywordMatch = combined.match(/(?:buy|purchase|shop)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*?)(?:\s+(?:product|item|products|items|\d+))?/i);
    const productKeyword = productKeywordMatch ? productKeywordMatch[1].trim().toLowerCase() : null;

    // Extract number from task (e.g., "Buy 1 product" or "Purchase 3 items")
    const numberMatch = combined.match(/(?:buy|purchase|shop).*?(\d+)/);
    const requiredCount = numberMatch ? parseInt(numberMatch[1]) : 1;

    let query = supabase
      .from('orders')
      .select(`
        id,
        products:product_id (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', taskCreatedAt); // Only orders after task creation

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error checking orders:', error);
      return { isValid: false, message: 'Error validating task requirements' };
    }

    // If product keyword is specified (e.g., "buy laptop"), filter by product name
    let matchingOrders = orders || [];
    if (productKeyword) {
      matchingOrders = matchingOrders.filter((order: any) => {
        const product = order.products;
        if (!product) return false;
        const productName = (product.name || '').toLowerCase();
        const productDesc = (product.description || '').toLowerCase();
        return productName.includes(productKeyword) || productDesc.includes(productKeyword);
      });
    }

    if (matchingOrders.length < requiredCount) {
      if (productKeyword) {
        return {
          isValid: false,
          message: `You need to purchase at least ${requiredCount} product(s) containing "${productKeyword}" to complete this task. You have purchased ${matchingOrders.length} matching product(s) since this task was created.`,
        };
      } else {
        return {
          isValid: false,
          message: `You need to purchase at least ${requiredCount} product(s) to complete this task. You have purchased ${matchingOrders.length} product(s) since this task was created.`,
        };
      }
    }
  }

  // Check for "complete X tasks" requirement
  if (combined.includes('complete') && combined.includes('task')) {
    const numberMatch = combined.match(/complete.*?(\d+).*?task/);
    if (numberMatch) {
      const requiredCount = parseInt(numberMatch[1]);
      // Only count tasks completed AFTER this task was created
      const { count, error } = await supabase
        .from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'claimed'])
        .gte('completed_at', taskCreatedAt); // Only tasks completed after this task creation

      if (error) {
        console.error('Error checking completed tasks:', error);
        return { isValid: false, message: 'Error validating task requirements' };
      }

      if ((count || 0) < requiredCount) {
        return {
          isValid: false,
          message: `You need to complete at least ${requiredCount} task(s) to complete this task. You have completed ${count || 0} task(s) since this task was created.`,
        };
      }
    }
  }



  return { isValid: true };
}

/**
 * Complete a task and claim reward
 * Validates task exists, checks if already completed, validates requirements, creates user_task record, grants coins
 */
export async function completeTask(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if task already completed
    const { data: existingUserTask } = await supabase
      .from('user_tasks')
      .select('status')
      .eq('user_id', userId)
      .eq('task_id', id)
      .single();

    if (existingUserTask?.status === 'completed' || existingUserTask?.status === 'claimed') {
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Validate task requirements (only count actions after task creation)
    const validation = await validateTaskRequirements(
      userId,
      task.title,
      task.description,
      task.created_at,
      task.validation_rule
    );
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message || 'Task requirements not met' });
    }

    // Create or update user_task record
    const { data: userTask, error: userTaskError } = await supabase
      .from('user_tasks')
      .upsert({
        user_id: userId,
        task_id: id,
        status: 'claimed',
        completed_at: new Date().toISOString(),
        claimed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,task_id'
      })
      .select()
      .single();

    if (userTaskError) {
      console.error('Create user task error:', userTaskError);
      return res.status(500).json({ error: 'Failed to complete task' });
    }



    // Grant reward coins (this will also register on blockchain if enabled)
    await createTransaction({
      userId,
      type: 'task_reward',
      amount: task.reward_amount,
      description: `Task reward: ${task.title}`,
      referenceId: task.id,
      referenceType: 'task'
    });

    // Send notification
    try {
      const { sendNotification } = await import('../services/notification.service');
      await sendNotification(userId, {
        title: 'Task Completed!',
        message: `You completed "${task.title}" and earned ${task.reward_amount} coins!`,
        type: 'task_completed',
        priority: 'medium',
        data: {
          taskId: task.id,
          taskTitle: task.title,
          rewardAmount: task.reward_amount,
        },
      });
    } catch (notifError) {
      // Don't fail the task completion if notification fails
      console.error('Failed to send notification:', notifError);
    }

    res.json({
      message: 'Task completed successfully',
      reward: task.reward_amount,
      task: {
        id: task.id,
        title: task.title,
        status: 'claimed'
      }
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Validate task by validation rule configuration
 * Supports: purchase, play_game, buy_stock, complete_tasks, manual
 */
async function validateTaskByRule(
  userId: string,
  rule: any,
  taskCreatedAt: string
): Promise<{ isValid: boolean; message?: string }> {
  const ruleType = rule.type;
  const requiredCount = rule.count || 1;

  switch (ruleType) {
    case 'manual':
      // Manual tasks can always be completed
      return { isValid: true };

    case 'purchase': {
      // Purchase product(s) - can specify productKeyword
      const productKeyword = rule.productKeyword ? rule.productKeyword.toLowerCase() : null;

      let query = supabase
        .from('orders')
        .select(`
          id,
          products:product_id (
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', taskCreatedAt);

      const { data: orders, error } = await query;

      if (error) {
        console.error('Error checking orders:', error);
        return { isValid: false, message: 'Error validating task requirements' };
      }

      let matchingOrders = orders || [];
      if (productKeyword) {
        matchingOrders = matchingOrders.filter((order: any) => {
          const product = order.products;
          if (!product) return false;
          const productName = (product.name || '').toLowerCase();
          const productDesc = (product.description || '').toLowerCase();
          return productName.includes(productKeyword) || productDesc.includes(productKeyword);
        });
      }

      if (matchingOrders.length < requiredCount) {
        if (productKeyword) {
          return {
            isValid: false,
            message: `You need to purchase at least ${requiredCount} product(s) containing "${productKeyword}" to complete this task. You have purchased ${matchingOrders.length} matching product(s) since this task was created.`,
          };
        } else {
          return {
            isValid: false,
            message: `You need to purchase at least ${requiredCount} product(s) to complete this task. You have purchased ${matchingOrders.length} product(s) since this task was created.`,
          };
        }
      }
      return { isValid: true };
    }



    case 'complete_tasks': {
      // Complete other task(s)
      const { count: completedCount, error } = await supabase
        .from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'claimed'])
        .gte('completed_at', taskCreatedAt);

      if (error) {
        console.error('Error checking completed tasks:', error);
        return { isValid: false, message: 'Error validating task requirements' };
      }

      if ((completedCount || 0) < requiredCount) {
        return {
          isValid: false,
          message: `You need to complete at least ${requiredCount} task(s) to complete this task. You have completed ${completedCount || 0} task(s) since this task was created.`,
        };
      }
      return { isValid: true };
    }

    default:
      return { isValid: false, message: `Unknown validation rule type: ${ruleType}` };
  }
}


