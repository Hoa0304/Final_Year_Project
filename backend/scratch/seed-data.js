require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Fixed IDs for consistency
const TEST_USER_ID = '8f4c4c7a-4228-4be7-b936-5a407a7b820c';

const FOOD_VENDOR = {
  email: 'foodshop@hmall.com',
  full_name: 'Delicious Foods',
  role: 'vendor',
  password_hash: 'mock_hash',
};

const DRINK_VENDOR = {
  email: 'drinkshop@hmall.com',
  full_name: 'Sweet Drinks',
  role: 'vendor',
  password_hash: 'mock_hash',
};

const FOOD_PRODUCTS = [
  { name: 'Phở Bò', price: 50000, description: 'Phở bò gia truyền', image_url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cb438?w=500&q=80', stock_quantity: 100 },
  { name: 'Pizza Hải Sản', price: 150000, description: 'Pizza hải sản phô mai', image_url: 'https://images.unsplash.com/photo-1513104890138-7c04985c8398?w=500&q=80', stock_quantity: 50 },
  { name: 'Hamburger Bò', price: 65000, description: 'Hamburger bò nướng', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', stock_quantity: 80 },
  { name: 'Cơm Tấm Sườn Bì', price: 45000, description: 'Cơm tấm Sài Gòn', image_url: 'https://images.unsplash.com/photo-1626804475297-4160aaeabaaf?w=500&q=80', stock_quantity: 120 },
];

const DRINK_PRODUCTS = [
  { name: 'Trà Sữa Trân Châu', price: 35000, description: 'Trà sữa trân châu đường đen', image_url: 'https://images.unsplash.com/photo-1558855567-1a438c1a6ff0?w=500&q=80', stock_quantity: 200 },
  { name: 'Nước Ép Cam', price: 30000, description: 'Nước cam vắt nguyên chất', image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80', stock_quantity: 150 },
  { name: 'Sinh Tố Dâu', price: 40000, description: 'Sinh tố dâu tây tươi mát', image_url: 'https://images.unsplash.com/photo-1553530666-ba11a90a21f6?w=500&q=80', stock_quantity: 100 },
  { name: 'Trà Đào Cam Sả', price: 38000, description: 'Trà đào thanh mát giải nhiệt', image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80', stock_quantity: 180 },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function getOrCreateVendor(vendorData) {
  let { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', vendorData.email)
    .single();
    
  if (existing) return existing;
  
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([vendorData])
    .select()
    .single();
    
  if (error) throw error;
  return newUser;
}

async function createProducts(vendorId, productsData) {
  // Check if they already exist
  const { data: existing } = await supabase
    .from('products')
    .select('*')
    .eq('created_by', vendorId);
    
  if (existing && existing.length > 0) return existing;

  const productsToInsert = productsData.map(p => ({
    ...p,
    created_by: vendorId,
    status: 'approved',
    is_active: true
  }));

  const { data, error } = await supabase
    .from('products')
    .insert(productsToInsert)
    .select();
    
  if (error) throw error;
  return data;
}

async function main() {
  try {
    console.log('1. Creating Vendors...');
    const foodVendor = await getOrCreateVendor(FOOD_VENDOR);
    const drinkVendor = await getOrCreateVendor(DRINK_VENDOR);
    
    console.log('2. Creating Products...');
    const foodProducts = await createProducts(foodVendor.id, FOOD_PRODUCTS);
    const drinkProducts = await createProducts(drinkVendor.id, DRINK_PRODUCTS);
    
    console.log('3. Generating Orders (May 1 to today)...');
    
    // Dates from May 1, 2026 to June 18, 2026
    const startDate = new Date('2026-05-01T00:00:00Z');
    const endDate = new Date('2026-06-18T23:59:59Z');
    
    const allOrders = [];
    const allOrderItems = [];
    
    // Loop through each day
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // 1 to 3 orders for Food
      const numFoodOrders = randomInt(1, 3);
      for (let i = 0; i < numFoodOrders; i++) {
        const orderId = uuidv4();
        // random time on this day
        const orderDate = new Date(currentDate);
        orderDate.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));
        
        // Pick 1-2 random items
        const numItems = randomInt(1, 2);
        
        for (let j = 0; j < numItems; j++) {
          const orderId = uuidv4();
          const prod = randomItem(foodProducts);
          const qty = randomInt(1, 2);
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
            user_id: TEST_USER_ID,
            vendor_id: foodVendor.id,
            product_id: prod.id,
            quantity: qty,
            status: 'delivered',
            total_amount: totalVND,
            price_vnd: finalVND,
            price_coins: finalCoins,
            original_price_coins: totalCoins,
            payment_method: method,
            created_at: orderDate.toISOString()
          });
        }
      }
      
      // 1 to 3 orders for Drink
      const numDrinkOrders = randomInt(1, 3);
      for (let i = 0; i < numDrinkOrders; i++) {
        const orderDate = new Date(currentDate);
        orderDate.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));
        
        const numItems = randomInt(1, 2);
        
        for (let j = 0; j < numItems; j++) {
          const orderId = uuidv4();
          const prod = randomItem(drinkProducts);
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
            user_id: TEST_USER_ID,
            vendor_id: drinkVendor.id,
            product_id: prod.id,
            quantity: qty,
            status: 'delivered',
            total_amount: totalVND,
            price_vnd: finalVND,
            price_coins: finalCoins,
            original_price_coins: totalCoins,
            payment_method: method,
            created_at: orderDate.toISOString()
          });
        }
      }
      
      // Advance by 1 day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Generated ${allOrders.length} orders. Inserting into database in chunks...`);
    
    // Chunk insert to avoid Payload Too Large
    const CHUNK_SIZE = 50;
    
    for (let i = 0; i < allOrders.length; i += CHUNK_SIZE) {
      const chunk = allOrders.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('orders').insert(chunk);
      if (error) console.error('Order Insert Error:', error);
    }
    
    console.log('✅ Seeding completed successfully!');
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

main();
