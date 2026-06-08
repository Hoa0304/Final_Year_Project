import { supabase } from '../utils/supabase';


export type TransactionType = 'earn' | 'spend' | 'grant' | 'revoke' | 'task_reward' | 'stock_profit' | 'stock_loss';

interface CreateTransactionParams {
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
}

/**
 * Create a transaction and update user balance
 * Uses the database function to ensure ACID compliance
 * Also records transaction on blockchain if enabled
 */
export async function createTransaction(params: CreateTransactionParams) {
  const { userId, type, amount, description, referenceId, referenceType, createdBy } = params;

  // Validate amount
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Get current balance to check if user has enough for spending
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('virtual_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Check if user has sufficient balance for spending transactions
  if (type === 'spend' && user.virtual_balance < amount) {
    throw new Error('Insufficient balance');
  }

  const balanceBefore = user.virtual_balance;
  let balanceAfter: number;

  // Calculate balance after transaction
  if (type === 'spend' || type === 'revoke' || type === 'stock_loss') {
    balanceAfter = balanceBefore - amount;
  } else {
    balanceAfter = balanceBefore + amount;
  }

  // Call database function to create transaction atomically
  console.log(`📝 Creating transaction: userId=${userId}, type=${type}, amount=${amount}`);
  const { data, error } = await supabase.rpc('create_transaction', {
    p_user_id: userId,
    p_type: type,
    p_amount: amount,
    p_description: description || null,
    p_reference_id: referenceId || null,
    p_reference_type: referenceType || null,
    p_created_by: createdBy || null
  });

  if (error) {
    console.error('❌ Transaction creation error:', error);
    throw new Error('Failed to create transaction');
  }

  console.log(`✅ Transaction created in database: ${data}`);



  return data;
}

/**
 * Get user transaction history
 */
export async function getUserTransactions(userId: string, limit: number = 50, offset: number = 0) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error('Failed to fetch transactions');
  }

  return data;
}


