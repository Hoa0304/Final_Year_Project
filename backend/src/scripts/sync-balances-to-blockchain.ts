/**
 * Script to sync user balances from database to blockchain
 * This is useful when:
 * - Users were created before blockchain was enabled
 * - Blockchain transactions failed but database was updated
 * - Need to sync existing balances to blockchain
 */

import { supabase } from '../utils/supabase';
import {
  isBlockchainEnabled,
  generateUserAddress,
  getTokenBalance,
  registerTransaction as registerBlockchainTransaction,
  mintTokens,
} from '../services/blockchain.service';

interface UserBalance {
  id: string;
  email: string;
  virtual_balance: number;
}

async function syncBalancesToBlockchain() {
  console.log('🔄 Starting balance sync to blockchain...\n');

  if (!isBlockchainEnabled()) {
    console.error('❌ Blockchain is not enabled. Please configure blockchain in .env');
    process.exit(1);
  }

  try {
    // Get all users with balance > 0
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, virtual_balance')
      .gt('virtual_balance', 0)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    if (!users || users.length === 0) {
      console.log('✅ No users with balance found');
      return;
    }

    console.log(`📊 Found ${users.length} users with balance > 0\n`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const userAddress = generateUserAddress(user.id);
        const blockchainBalance = await getTokenBalance(userAddress);
        const databaseBalance = user.virtual_balance;

        console.log(`\n👤 User: ${user.email}`);
        console.log(`   Database Balance: ${databaseBalance} VKU`);
        console.log(`   Blockchain Balance: ${blockchainBalance} VKU`);

        if (Math.abs(databaseBalance - blockchainBalance) < 0.01) {
          console.log(`   ✅ Already synced`);
          skipped++;
          continue;
        }

        const difference = databaseBalance - blockchainBalance;
        console.log(`   Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} VKU`);

        if (difference > 0) {
          // Need to mint tokens
          console.log(`   🔨 Minting ${difference.toFixed(2)} tokens...`);

          // Register transaction on blockchain
          const blockchainTxId = await registerBlockchainTransaction({
            userAddress,
            transactionType: 'grant',
            amount: difference,
            balanceBefore: blockchainBalance,
            balanceAfter: databaseBalance,
            description: 'Balance sync from database',
            referenceType: 'balance_sync',
          });

          // Mint tokens
          await mintTokens(userAddress, difference);

          console.log(`   ✅ Synced! Blockchain TX ID: ${blockchainTxId}`);
          synced++;
        } else {
          // Balance is higher on blockchain (shouldn't happen, but handle it)
          console.log(`   ⚠️  Blockchain balance is higher. Skipping.`);
          skipped++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error syncing user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n\n📊 Sync Summary:`);
    console.log(`   ✅ Synced: ${synced} users`);
    console.log(`   ⏭️  Skipped: ${skipped} users`);
    console.log(`   ❌ Errors: ${errors} users`);
    console.log(`\n✅ Balance sync completed!`);
  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncBalancesToBlockchain()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { syncBalancesToBlockchain };




