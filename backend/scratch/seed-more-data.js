require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_USER_ID = '8f4c4c7a-4228-4be7-b936-5a407a7b820c';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const GENERIC_PRODUCTS = [
  { name: 'Áo thun nam', price: 120000, description: 'Áo thun cotton mát mẻ', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', stock_quantity: 100 },
  { name: 'Quần Jeans', price: 250000, description: 'Quần jeans thời trang', image_url: 'https://images.unsplash.com/photo-1542272604-78021c3b1263?w=500&q=80', stock_quantity: 50 },
  { name: 'Giày Thể Thao', price: 350000, description: 'Giày chạy bộ êm ái', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', stock_quantity: 80 },
  { name: 'Túi Xách Nữ', price: 180000, description: 'Túi xách dạo phố', image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80', stock_quantity: 120 },
  { name: 'Đồng Hồ', price: 500000, description: 'Đồng hồ thanh lịch', image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80', stock_quantity: 200 },
];

async function createProductsForVendor(vendorId) {
  const { data: existing } = await supabase
    .from('products')
    .select('*')
    .eq('created_by', vendorId);
    
  if (existing && existing.length > 0) return existing;

  const productsToInsert = GENERIC_PRODUCTS.map(p => ({
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

async function seed100Users() {
  const users = [];
  for (let i = 1; i <= 100; i++) {
    users.push({
      email: `customer${i}_${Date.now()}@hmall.com`,
      full_name: `Customer ${i}`,
      role: 'user',
      password_hash: 'mock_hash',
      virtual_balance: randomInt(0, 50000)
    });
  }
  
  console.log(`Inserting ${users.length} new users...`);
  
  const CHUNK_SIZE = 50;
  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('users').insert(chunk);
    if (error) console.error('User Insert Error:', error);
  }
}

async function main() {
  try {
    console.log('1. Generating 100 Users...');
    await seed100Users();
    
    console.log('2. Fetching other vendors...');
    const { data: vendors } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'vendor')
      .not('email', 'in', '("foodshop@hmall.com", "drinkshop@hmall.com")');
      
    console.log(`Found ${vendors.length} other vendors.`);
    
    // Dates from May 1 to June 18
    const startDate = new Date('2026-05-01T00:00:00Z');
    const endDate = new Date('2026-06-18T23:59:59Z');
    
    let totalOrdersGenerated = 0;
    
    for (const vendor of vendors) {
      console.log(`Seeding data for vendor: ${vendor.email}`);
      const products = await createProductsForVendor(vendor.id);
      
      let currentDate = new Date(startDate);
      const allOrders = [];
      
      while (currentDate <= endDate) {
        // 1 to 2 orders per day
        const numOrders = randomInt(1, 2);
        
        for (let i = 0; i < numOrders; i++) {
          const orderId = uuidv4();
          const orderDate = new Date(currentDate);
          orderDate.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));
          
          const prod = randomItem(products);
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
            vendor_id: vendor.id,
            product_id: prod.id,
            quantity: qty,
            status: 'delivered',
            total_amount: totalVND,
            price_vnd: finalVND,
            price_coins: finalCoins,
            original_price_coins: totalVND, // Put total VND here
            payment_method: method,
            created_at: orderDate.toISOString()
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const CHUNK_SIZE = 50;
      for (let i = 0; i < allOrders.length; i += CHUNK_SIZE) {
        const chunk = allOrders.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('orders').insert(chunk);
        if (error) console.error('Order Insert Error:', error);
      }
      
      totalOrdersGenerated += allOrders.length;
    }
    
    console.log(`✅ Seeding completed! Generated ${totalOrdersGenerated} orders across ${vendors.length} vendors.`);
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

main();
