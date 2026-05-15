import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createTransaction } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Grant or revoke virtual coins to/from a user
 * Admin only - creates transaction with admin reference
 */
export async function grantCoins(req: AuthRequest, res: Response) {
  try {
    const adminId = req.user!.userId;
    const { id: userId } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount === 0) {
      return res.status(400).json({ error: 'Amount is required and cannot be zero' });
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, virtual_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine transaction type
    const transactionType = amount > 0 ? 'grant' : 'revoke';
    const absoluteAmount = Math.abs(amount);

    // Create transaction
    await createTransaction({
      userId,
      type: transactionType,
      amount: absoluteAmount,
      description: description || `Admin ${transactionType} by admin`,
      createdBy: adminId
    });

    // Get updated balance
    const { data: updatedUser } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    res.json({
      message: `Successfully ${transactionType === 'grant' ? 'granted' : 'revoked'} ${absoluteAmount} coins`,
      user: {
        id: user.id,
        email: user.email,
        previousBalance: user.virtual_balance,
        newBalance: updatedUser?.virtual_balance
      }
    });
  } catch (error: any) {
    console.error('Grant coins error:', error);
    if (error.message === 'Insufficient balance' && parseFloat(req.body.amount) < 0) {
      return res.status(400).json({ error: 'User has insufficient balance to revoke this amount' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, virtual_balance, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user statistics (admin only)
 */
export async function getUserStats(req: Request, res: Response) {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total transactions
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    // Get total virtual currency in circulation
    const { data: balanceData } = await supabase
      .from('users')
      .select('virtual_balance');

    const totalBalance = balanceData?.reduce((sum, user) => sum + parseFloat(user.virtual_balance.toString()), 0) || 0;

    res.json({
      totalUsers,
      totalTransactions,
      totalBalance,
      averageBalance: totalUsers ? totalBalance / totalUsers : 0
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all products (admin view)
 */
export async function getProducts(req: Request, res: Response) {
  try {
    // Admin can see all products (active and inactive), no limit
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000); // Set a high limit to get all products

    if (error) {
      console.error('Get products error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    res.json({ products: products || [] });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a new product
 */
export async function createProduct(req: Request, res: Response) {
  try {
    const { name, description, price, imageUrl, category, stockQuantity } = req.body;
    const adminId = (req as AuthRequest).user!.userId;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        description: description || null,
        price,
        image_url: imageUrl || null,
        category: category || null,
        stock_quantity: stockQuantity || 0,
        created_by: adminId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Create product error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update a product
 */
export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, price, imageUrl, category, stockQuantity, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({ error: 'Price cannot be negative' });
      }
      updateData.price = price;
    }
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (category !== undefined) updateData.category = category;
    if (stockQuantity !== undefined) updateData.stock_quantity = stockQuantity;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update product error:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a product (soft delete by setting is_active to false)
 */
export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all tasks (admin view) with completion statistics
 */
export async function getTasks(req: Request, res: Response) {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000); // Set a high limit to get all tasks

    if (error) {
      console.error('Get tasks error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }

    // Get completion statistics for each task
    const tasksWithStats = await Promise.all(
      (tasks || []).map(async (task) => {
        // Count total completions (claimed status)
        const { count: completionCount } = await supabase
          .from('user_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('task_id', task.id)
          .in('status', ['completed', 'claimed']);

        return {
          ...task,
          completionCount: completionCount || 0,
        };
      })
    );

    res.json({ tasks: tasksWithStats });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get task completion details (admin view)
 * Returns list of users who completed a specific task
 */
export async function getTaskCompletions(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    // Get all user_tasks for this task with user info
    const { data: completions, error } = await supabase
      .from('user_tasks')
      .select(`
        id,
        user_id,
        status,
        completed_at,
        claimed_at,
        created_at,
        users:user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('task_id', taskId)
      .in('status', ['completed', 'claimed'])
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Get task completions error:', error);
      return res.status(500).json({ error: 'Failed to fetch task completions' });
    }

    res.json({ completions: completions || [] });
  } catch (error) {
    console.error('Get task completions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a new task
 */
export async function createTask(req: Request, res: Response) {
  try {
    const { title, description, rewardAmount, isActive, validationRule } = req.body;
    const adminId = (req as AuthRequest).user!.userId;

    if (!title || !rewardAmount) {
      return res.status(400).json({ error: 'Title and reward amount are required' });
    }

    if (rewardAmount < 0) {
      return res.status(400).json({ error: 'Reward amount cannot be negative' });
    }

    // Validate validation rule if provided
    if (validationRule) {
      const validTypes = ['purchase', 'play_game', 'buy_stock', 'complete_tasks', 'manual'];
      if (!validTypes.includes(validationRule.type)) {
        return res.status(400).json({ error: `Invalid validation rule type. Must be one of: ${validTypes.join(', ')}` });
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        reward_amount: rewardAmount,
        created_by: adminId,
        is_active: isActive !== undefined ? isActive : true,
        validation_rule: validationRule || null
      })
      .select()
      .single();

    if (error) {
      console.error('Create task error:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update a task
 */
export async function updateTask(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, description, rewardAmount, isActive, validationRule } = req.body;

    const updateData: any = {};

    // Validate validation rule if provided
    if (validationRule !== undefined) {
      if (validationRule === null) {
        // Allow clearing the rule
        updateData.validation_rule = null;
      } else {
        const validTypes = ['purchase', 'play_game', 'buy_stock', 'complete_tasks', 'manual'];
        if (!validTypes.includes(validationRule.type)) {
          return res.status(400).json({ error: `Invalid validation rule type. Must be one of: ${validTypes.join(', ')}` });
        }
        updateData.validation_rule = validationRule;
      }
    }

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (rewardAmount !== undefined) {
      if (rewardAmount < 0) {
        return res.status(400).json({ error: 'Reward amount cannot be negative' });
      }
      updateData.reward_amount = rewardAmount;
    }
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update task error:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a task (soft delete by setting is_active to false)
 */
export async function deleteTask(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Delete task error:', error);
      return res.status(500).json({ error: 'Failed to delete task' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all transactions (admin only)
 * Returns all transactions from all users with user information
 */
export async function getAllTransactions(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.userId as string | undefined;
    const type = req.query.type as string | undefined;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        user:user_id (
          id,
          email,
          full_name
        ),
        created_by_user:created_by (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by user if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Get all transactions error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }
    if (type) {
      countQuery = countQuery.eq('type', type);
    }

    const { count } = await countQuery;

    res.json({
      transactions: transactions || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Sync user balances from database to blockchain (admin only)
 * This is useful when users were created before blockchain was enabled
 */
export async function syncBalancesToBlockchainController(req: AuthRequest, res: Response) {
  try {
    // Import sync function
    const { syncBalancesToBlockchain } = await import('../scripts/sync-balances-to-blockchain');
    
    // This is an async operation, so we'll start it and return immediately
    // In production, you might want to use a job queue
    syncBalancesToBlockchain()
      .then(() => {
        console.log('✅ Balance sync completed');
      })
      .catch((error) => {
        console.error('❌ Balance sync failed:', error);
      });

    res.json({
      message: 'Balance sync started. Check server logs for progress.',
      note: 'This operation may take a while. Check server logs for details.',
    });
  } catch (error: any) {
    console.error('Sync balances error:', error);
    res.status(500).json({ error: 'Failed to start balance sync' });
  }
}


