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

async function main() {
  try {
    console.log('1. Fetching Admin Products...');
    const { data: adminProducts, error: pError } = await supabase
      .from('products')
      .select('id, name, price')
      .is('created_by', null);

    if (pError) throw pError;
    
    if (!adminProducts || adminProducts.length === 0) {
      console.log('No admin products found.');
      return;
    }
    console.log(`Found ${adminProducts.length} admin products.`);

    console.log('2. Fetching Seeded Users...');
    const { data: users, error: uError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'user');

    if (uError) throw uError;

    if (!users || users.length === 0) {
      console.log('No users found.');
      return;
    }
    console.log(`Found ${users.length} users to place orders.`);

    console.log('3. Generating Admin Orders...');
    const startDate = new Date('2026-05-01T00:00:00Z');
    const endDate = new Date('2026-06-18T23:59:59Z');
    
    let currentDate = new Date(startDate);
    const allOrders = [];
    
    while (currentDate <= endDate) {
      // 3 to 6 orders per day for admin products
      const numOrders = randomInt(3, 6);
      
      for (let i = 0; i < numOrders; i++) {
        const orderId = uuidv4();
        const orderDate = new Date(currentDate);
        orderDate.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));
        
        const prod = randomItem(adminProducts);
        const qty = randomInt(1, 3);
        const pVnd = prod.price;
        const pCoin = Math.floor(prod.price / 10);
        const totalVND = pVnd * qty;
        const totalCoins = pCoin * qty;
        
        const paymentMethods = ['VND', 'Coins', 'Mixed'];
        const method = randomItem(paymentMethods);
        
        let finalVND = 0;
        let finalCoins = 0;
        if (method === 'VND') {
          finalVND = totalVND;
        } else if (method === 'Coins') {
          finalCoins = totalCoins;
        } else {
          finalVND = totalVND / 2;
          finalCoins = totalCoins / 2;
        }
        
        allOrders.push({
          id: orderId,
          user_id: randomItem(users).id,
          vendor_id: null, // Admin products have null vendor
          product_id: prod.id,
          quantity: qty,
          status: 'delivered',
          total_amount: totalVND,
          price_vnd: finalVND,
          price_coins: finalCoins,
          original_price_coins: totalVND,
          payment_method: method,
          created_at: orderDate.toISOString()
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Inserting ${allOrders.length} orders for admin...`);
    
    const CHUNK_SIZE = 50;
    for (let i = 0; i < allOrders.length; i += CHUNK_SIZE) {
      const chunk = allOrders.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('orders').insert(chunk);
      if (error) console.error('Order Insert Error:', error);
    }
    
    console.log('✅ Seeding completed! Admin now has sales data.');
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

main();
