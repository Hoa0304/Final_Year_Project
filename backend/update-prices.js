/**
 * Script cập nhật giá sản phẩm cho phù hợp với 10 xu ban đầu
 * Tỷ lệ: 1 xu ≈ 10,000 VND
 * 
 * Chạy: node update-prices.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54330',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function main() {
  console.log('📦 Lấy danh sách sản phẩm hiện có...');
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price')
    .order('price', { ascending: true });

  if (error) {
    console.error('❌ Lỗi khi lấy sản phẩm:', error.message);
    process.exit(1);
  }

  console.log(`✅ Tìm thấy ${products.length} sản phẩm:`);
  products.forEach(p => {
    console.log(`   - ${p.name}: ${p.price} xu (${(p.price * 10000).toLocaleString('vi-VN')} VND)`);
  });

  // Cập nhật giá sản phẩm mặc định (seeded products)
  const priceMap = {
    'Mouse': 2,
    'Keyboard': 3,
    'Headphones': 5,
    'Speaker': 8,
    'Book': 1,
    'Watch': 15,
    'Shoes': 20,
    'Course': 25,
    'Tablet': 30,
    'Camera': 40,
    'Laptop': 50,
    'Smartphone': 60,
  };

  console.log('\n🔄 Cập nhật giá sản phẩm mặc định...');
  for (const [name, price] of Object.entries(priceMap)) {
    const { error: updateErr, count } = await supabase
      .from('products')
      .update({ price })
      .eq('name', name);
    
    if (updateErr) {
      console.log(`   ⚠️ ${name}: Lỗi - ${updateErr.message}`);
    } else {
      console.log(`   ✅ ${name}: ${price} xu (~${(price * 10000).toLocaleString('vi-VN')} VND)`);
    }
  }

  // Lấy tất cả sản phẩm có giá > 200 (vendor products cũ)
  const { data: expensiveProducts } = await supabase
    .from('products')
    .select('id, name, price')
    .gt('price', 200);

  if (expensiveProducts && expensiveProducts.length > 0) {
    console.log(`\n🔄 Cập nhật ${expensiveProducts.length} sản phẩm có giá > 200 xu...`);
    for (const product of expensiveProducts) {
      // Giảm giá xuống 1/100 (ví dụ 800 -> 8)
      const newPrice = Math.max(1, Math.round(product.price / 100));
      const { error: updateErr } = await supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', product.id);
      
      if (updateErr) {
        console.log(`   ⚠️ ${product.name}: Lỗi - ${updateErr.message}`);
      } else {
        console.log(`   ✅ ${product.name}: ${product.price} xu → ${newPrice} xu`);
      }
    }
  }

  // Cập nhật tasks reward (đảm bảo không có .00)
  console.log('\n🔄 Cập nhật reward nhiệm vụ...');
  const taskRewards = [
    { title: 'Complete Profile', reward_amount: 50 },
    { title: 'First Purchase', reward_amount: 100 },
    { title: 'Daily Login', reward_amount: 10 },
    { title: 'Stock Trader', reward_amount: 150 },
    { title: 'Task Master', reward_amount: 200 },
  ];
  
  for (const task of taskRewards) {
    const { error: taskErr } = await supabase
      .from('tasks')
      .update({ reward_amount: task.reward_amount })
      .eq('title', task.title);
    
    if (taskErr) {
      console.log(`   ⚠️ ${task.title}: Lỗi - ${taskErr.message}`);
    } else {
      console.log(`   ✅ ${task.title}: ${task.reward_amount} xu`);
    }
  }

  console.log('\n✅ Hoàn thành cập nhật!');
  
  // Kiểm tra lại
  const { data: updatedProducts } = await supabase
    .from('products')
    .select('name, price')
    .order('price', { ascending: true })
    .limit(15);
  
  console.log('\n📊 Giá sản phẩm sau khi cập nhật:');
  updatedProducts?.forEach(p => {
    console.log(`   ${p.name}: ${p.price} xu (~${(p.price * 10000).toLocaleString('vi-VN')} VND)`);
  });
}

main().catch(console.error);
