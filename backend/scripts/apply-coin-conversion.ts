import { supabase } from '../src/utils/supabase';

async function applyCoinConversion() {
  console.log('🚀 Starting database coin conversion and voucher cleanup...');

  try {
    // 1. Truncate / delete all user vouchers and vouchers
    console.log('🧹 Clearing voucher data...');
    
    console.log('   Deleting from user_vouchers...');
    const { error: uvDeleteError } = await supabase
      .from('user_vouchers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    if (uvDeleteError) {
      console.warn('   ⚠️ Failed to delete user_vouchers rows:', uvDeleteError.message);
    } else {
      console.log('   ✅ Cleared user_vouchers table.');
    }

    console.log('   Deleting from vouchers...');
    const { error: vDeleteError } = await supabase
      .from('vouchers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    if (vDeleteError) {
      console.warn('   ⚠️ Failed to delete vouchers rows:', vDeleteError.message);
    } else {
      console.log('   ✅ Cleared vouchers table.');
    }

    // 2. Update coin packages
    console.log('\n🪙 Updating coin packages pricing (1 coin = 100 VND)...');
    
    // Fetch current coin packages
    const { data: packages, error: fetchError } = await supabase
      .from('coin_packages')
      .select('*');
      
    if (fetchError) throw fetchError;
    
    const targetPackages = [
      { name: 'Starter Pack', coins: 100, price_vnd: 10000, description: '100 coins for basic features' },
      { name: 'Pro Pack', coins: 500, price_vnd: 45000, description: '500 coins (10% discount)' },
      { name: 'Whale Pack', coins: 1200, price_vnd: 100000, description: '1200 coins (20% discount)' }
    ];

    for (const target of targetPackages) {
      const existing = packages?.find(p => p.name === target.name);
      if (existing) {
        console.log(`   Updating package: "${target.name}" -> ${target.coins} coins, ${target.price_vnd} VND`);
        const { error: updateError } = await supabase
          .from('coin_packages')
          .update({
            coins: target.coins,
            price_vnd: target.price_vnd,
            description: target.description
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        console.log(`   Inserting new package: "${target.name}" -> ${target.coins} coins, ${target.price_vnd} VND`);
        const { error: insertError } = await supabase
          .from('coin_packages')
          .insert(target);
        if (insertError) throw insertError;
      }
    }
    console.log('   ✅ Coin packages updated successfully.');

    console.log('\n✨ Database conversion and voucher cleanup completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Error during database conversion script:', error.message || error);
  }

  process.exit(0);
}

applyCoinConversion();
