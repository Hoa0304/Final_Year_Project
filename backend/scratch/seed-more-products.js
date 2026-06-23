require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const CATEGORIES = ['Electronics', 'Clothing', 'Home', 'Books', 'Sports', 'Beauty', 'Toys'];
const ADJECTIVES = ['Premium', 'Luxury', 'Basic', 'Essential', 'Pro', 'Ultra', 'Smart', 'Classic', 'Modern', 'Vintage'];
const NOUNS = ['Gadget', 'Widget', 'Device', 'Tool', 'Kit', 'Bundle', 'Pack', 'System', 'Set', 'Accessory'];

function generateProductName() {
  return `${randomItem(ADJECTIVES)} ${randomItem(NOUNS)} ${randomInt(100, 999)}`;
}

async function main() {
  try {
    console.log('1. Fetching all vendors...');
    const { data: vendors } = await supabase.from('users').select('id, email').eq('role', 'vendor');
    if (!vendors) throw new Error('No vendors found');
    console.log(`Found ${vendors.length} vendors.`);

    // Wait, let's also upgrade ALL vendors to VIP Monthly
    console.log('2. Upgrading all vendors to VIP Monthly...');
    const { data: vipPkg } = await supabase.from('vendor_packages').select('id').eq('name', 'VIP Monthly').single();
    if (vipPkg) {
      for (const v of vendors) {
        // Check if exists
        const { data: existingSub } = await supabase.from('vendor_subscriptions').select('id').eq('vendor_id', v.id).single();
        if (!existingSub) {
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);
          await supabase.from('vendor_subscriptions').insert({
            vendor_id: v.id,
            package_id: vipPkg.id,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            auto_renew: true
          });
        }
      }
      console.log('✅ VIP Upgrade complete.');
    }

    console.log('3. Fetching Seeded Users...');
    const { data: users } = await supabase.from('users').select('id').eq('role', 'user');

    console.log('4. Generating Products and Orders...');
    const allProducts = [];
    const allOrders = [];
    const allTransactions = [];

    const startDate = new Date('2026-05-01T00:00:00Z');
    const endDate = new Date('2026-06-18T23:59:59Z');

    for (const vendor of vendors) {
      console.log(`Generating data for vendor: ${vendor.email}`);
      const numProducts = randomInt(15, 30);
      const vendorProducts = [];

      for (let i = 0; i < numProducts; i++) {
        const prodId = uuidv4();
        const price = randomInt(50, 5000) * 1000; // 50k to 5M
        const prod = {
          id: prodId,
          name: generateProductName(),
          description: 'High quality product generated for testing',
          price,
          category: randomItem(CATEGORIES),
          stock_quantity: randomInt(50, 500),
          created_by: vendor.id,
          is_active: true,
          status: 'approved'
        };
        allProducts.push(prod);
        vendorProducts.push(prod);
      }

      // Generate orders
      const numOrders = randomInt(50, 150);
      for (let i = 0; i < numOrders; i++) {
        const orderId = uuidv4();
        const orderDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        
        const prod = randomItem(vendorProducts);
        const qty = randomInt(1, 3);
        const totalVND = prod.price * qty;
        
        // 80% VND, 10% Coins, 10% Mixed
        const rand = Math.random();
        let method = 'VND';
        let finalVND = totalVND;
        let finalCoins = 0;

        if (rand > 0.9) {
          method = 'Coins';
          finalVND = 0;
          finalCoins = Math.floor(totalVND / 10);
        } else if (rand > 0.8) {
          method = 'Mixed';
          finalVND = totalVND / 2;
          finalCoins = Math.floor((totalVND / 2) / 10);
        }

        const buyerId = randomItem(users).id;

        allOrders.push({
          id: orderId,
          user_id: buyerId,
          vendor_id: vendor.id,
          product_id: prod.id,
          quantity: qty,
          status: 'delivered',
          total_amount: totalVND,
          price_vnd: finalVND,
          price_coins: finalCoins,
          original_price_coins: totalVND, // total in VND
          payment_method: method,
          created_at: orderDate.toISOString()
        });

        // Transactions
        if (finalCoins > 0) {
          allTransactions.push({
            id: uuidv4(),
            user_id: buyerId,
            type: 'spend',
            amount: finalCoins,
            description: `Order Spend`,
            reference_id: orderId,
            reference_type: 'order',
            created_at: orderDate.toISOString(),
            created_by: buyerId,
            balance_before: 0,
            balance_after: 0
          });
        }

        if (finalVND === 0 && finalCoins > 0) {
          allTransactions.push({
            id: uuidv4(),
            user_id: vendor.id,
            type: 'earn',
            amount: Math.round(totalVND * 0.9),
            description: `Sale Earn`,
            reference_id: orderId,
            reference_type: 'order_income',
            created_at: orderDate.toISOString(),
            created_by: vendor.id,
            balance_before: 0,
            balance_after: 0
          });
        }
      }
    }

    console.log(`Inserting ${allProducts.length} products...`);
    const { error: pErr } = await supabase.from('products').insert(allProducts);
    if (pErr) console.error('Product insert error:', pErr);

    console.log(`Inserting ${allOrders.length} orders...`);
    for (let i = 0; i < allOrders.length; i += 500) {
      await supabase.from('orders').insert(allOrders.slice(i, i + 500));
    }

    console.log(`Inserting ${allTransactions.length} transactions...`);
    for (let i = 0; i < allTransactions.length; i += 500) {
      await supabase.from('transactions').insert(allTransactions.slice(i, i + 500));
    }

    console.log('✅ Full Seeding Complete!');

  } catch (err) {
    console.error('Script error:', err);
  }
}

main();
