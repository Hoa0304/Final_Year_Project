require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, payment_method, price_coins, price_vnd, created_at, late_compensation_voucher_id, products(name)')
    .gte('created_at', since.toISOString())
    .limit(1);

  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('Success:', orders);
  }
}

main();
