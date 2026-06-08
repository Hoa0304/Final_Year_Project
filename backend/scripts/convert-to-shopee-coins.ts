import { supabase } from '../src/utils/supabase';

async function convertToShopeeCoins() {
  console.log('🚀 Starting Shopee coin database conversion...');

  try {
    // 1. Update product prices (multiply by 1000)
    console.log('📦 Updating products table...');
    
    // Fetch all products
    const { data: products, error: pError } = await supabase
      .from('products')
      .select('id, price, discount_percentage');
    
    if (pError) throw pError;

    if (products) {
      for (const p of products) {
        // Multiply price by 1000
        const newPrice = p.price * 1000;
        
        console.log(`   Product ID ${p.id}: ${p.price} -> ${newPrice} VND`);
        
        const updateData: any = { price: newPrice };
        
        // Update product
        const { error: upError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', p.id);
          
        if (upError) {
          console.warn(`   ⚠️ Failed to update product ${p.id}:`, upError.message);
        }
      }
      console.log('   ✅ Products price conversion completed.');
    }

    // 2. Update tasks rewards (multiply by 1000)
    console.log('📋 Updating tasks reward amounts...');
    const { data: tasks, error: tError } = await supabase
      .from('tasks')
      .select('id, title, reward_amount');
      
    if (tError) throw tError;
    
    if (tasks) {
      for (const t of tasks) {
        const newReward = t.reward_amount * 1000;
        console.log(`   Task "${t.title}": ${t.reward_amount} -> ${newReward} coins`);
        const { error: utError } = await supabase
          .from('tasks')
          .update({ reward_amount: newReward })
          .eq('id', t.id);
        if (utError) {
          console.warn(`   ⚠️ Failed to update task ${t.id}:`, utError.message);
        }
      }
      console.log('   ✅ Tasks reward conversion completed.');
    }

    // 3. Update users virtual balances (multiply by 1000)
    console.log('👤 Updating users virtual balances...');
    const { data: users, error: uError } = await supabase
      .from('users')
      .select('id, email, virtual_balance');
      
    if (uError) throw uError;
    
    if (users) {
      for (const u of users) {
        const newBalance = u.virtual_balance * 1000;
        console.log(`   User <${u.email}>: ${u.virtual_balance} -> ${newBalance} coins`);
        const { error: uuError } = await supabase
          .from('users')
          .update({ virtual_balance: newBalance })
          .eq('id', u.id);
        if (uuError) {
          console.warn(`   ⚠️ Failed to update user balance ${u.id}:`, uuError.message);
        }
      }
      console.log('   ✅ Users balance conversion completed.');
    }

    // 4. Update coin packages to 1:1 rate
    console.log('🪙 Updating coin packages...');
    const { data: packages, error: pkgFetchError } = await supabase
      .from('coin_packages')
      .select('*');
      
    if (pkgFetchError) throw pkgFetchError;
    
    const targetPackages = [
      { name: 'Starter Pack', coins: 10000, price_vnd: 10000, description: '10,000 coins (10k VND) for basic offset' },
      { name: 'Pro Pack', coins: 50000, price_vnd: 45000, description: '50,000 coins (10% discount - pay 45k VND)' },
      { name: 'Whale Pack', coins: 120000, price_vnd: 100000, description: '120,000 coins (20% discount - pay 100k VND)' }
    ];

    for (const target of targetPackages) {
      const existing = packages?.find(p => p.name === target.name);
      if (existing) {
        console.log(`   Updating package: "${target.name}" -> ${target.coins} coins, ${target.price_vnd} VND`);
        const { error: pkgUpError } = await supabase
          .from('coin_packages')
          .update({
            coins: target.coins,
            price_vnd: target.price_vnd,
            description: target.description,
            is_active: true
          })
          .eq('id', existing.id);
        if (pkgUpError) throw pkgUpError;
      } else {
        console.log(`   Inserting package: "${target.name}" -> ${target.coins} coins, ${target.price_vnd} VND`);
        const { error: pkgInError } = await supabase
          .from('coin_packages')
          .insert(target);
        if (pkgInError) throw pkgInError;
      }
    }
    console.log('   ✅ Coin packages conversion completed.');

    console.log('✨ All database conversions completed successfully!');
  } catch (error: any) {
    console.error('❌ Error during database conversion:', error.message || error);
  }

  process.exit(0);
}

convertToShopeeCoins();
