require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Starting order cleanup...');

  // 1. Get an admin user
  const { data: admin, error: adminErr } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  if (adminErr || !admin) {
    console.error('Failed to find admin user', adminErr);
    return;
  }
  console.log('Found admin ID:', admin.id);

  // 2. Fetch orders where vendor_id is null
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, product_id, products(name)')
    .is('vendor_id', null);

  if (ordersErr) {
    console.error('Failed to fetch orders', ordersErr);
    return;
  }

  console.log(`Found ${orders.length} orders with no vendor.`);

  for (const order of orders) {
    const productName = order.products?.name?.toLowerCase() || '';
    if (productName.includes('camera')) {
      // 3. Update 'camera' orders to admin
      console.log(`Updating order ${order.id} (Product: ${productName}) to Admin`);
      await supabase.from('orders').update({ vendor_id: admin.id }).eq('id', order.id);
    } else {
      // 4. Delete others
      console.log(`Deleting order ${order.id} (Product: ${productName})`);
      await supabase.from('orders').delete().eq('id', order.id);
    }
  }

  console.log('Done!');
}

main();
