import { supabase } from '../utils/supabase';
import {
  isBlockchainEnabled,
  generateUserAddress,
  registerTransaction as registerBlockchainTransaction,
  mintTokens,
  burnTokens,
} from './blockchain.service';

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

  // Register transaction on blockchain if enabled
  if (isBlockchainEnabled()) {
    console.log(`🔗 Blockchain enabled, registering transaction on blockchain...`);
    try {
      const userAddress = generateUserAddress(userId);
      const createdByAddress = createdBy ? generateUserAddress(createdBy) : undefined;

      console.log(`   User address: ${userAddress}`);
      console.log(`   Transaction type: ${type}, Amount: ${amount}`);

      // Register transaction on blockchain
      console.log(`   📝 Registering transaction on blockchain...`);
      const blockchainTxId = await registerBlockchainTransaction({
        userAddress,
        transactionType: type,
        amount,
        balanceBefore,
        balanceAfter,
        description: description || '',
        referenceId: referenceId || undefined,
        referenceType: referenceType || undefined,
        createdByAddress,
      });

      console.log(`   ✅ Transaction registered on blockchain with ID: ${blockchainTxId}`);

      // Update token balance on blockchain
      // Mint tokens for earning transactions
      if (type === 'earn' || type === 'grant' || type === 'task_reward' || type === 'stock_profit') {
        console.log(`   🪙 Minting ${amount} tokens to ${userAddress}...`);
        const mintTxHash = await mintTokens(userAddress, amount);
        console.log(`   ✅ Tokens minted successfully. TX Hash: ${mintTxHash}`);
      }
      // Burn tokens for spending transactions
      else if (type === 'spend' || type === 'revoke' || type === 'stock_loss') {
        console.log(`   🔥 Burning ${amount} tokens from ${userAddress}...`);
        const burnTxHash = await burnTokens(userAddress, amount);
        console.log(`   ✅ Tokens burned successfully. TX Hash: ${burnTxHash}`);
      }

      console.log(`✅ Transaction ${data} fully registered on blockchain with ID: ${blockchainTxId}`);
    } catch (blockchainError: any) {
      // Log blockchain error but don't fail the transaction
      // Database transaction is already committed
      console.error('❌ Blockchain registration error (transaction still saved to database):');
      console.error('   Error message:', blockchainError.message);
      console.error('   Error code:', blockchainError.code);
      console.error('   Full error:', blockchainError);
      
      // Check if it's a contract not found error
      if (blockchainError.message?.includes('does not exist') || blockchainError.code === 'BAD_DATA') {
        console.error('   ⚠️  Contract may not be deployed or address is incorrect');
        console.error('   💡 Solution: Deploy contracts and update .env with correct addresses');
      }
    }
  } else {
    console.warn('⚠️  Blockchain is not enabled. Transaction saved to database only.');
    console.warn('   To enable blockchain, configure BLOCKCHAIN_* variables in .env');
  }

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


