require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Adding transaction for admin order...');

  const { data: admin } = await supabase
    .from('users')
    .select('id, virtual_balance')
    .eq('role', 'admin')
    .limit(1)
    .single();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', admin.id)
    .limit(1)
    .single();

  if (!order) {
    console.log('No order found for admin');
    return;
  }

  const { data: existingTx } = await supabase
    .from('transactions')
    .select('id')
    .eq('reference_id', order.id)
    .eq('user_id', admin.id)
    .single();

  if (existingTx) {
    console.log('Transaction already exists for admin:', existingTx.id);
    return;
  }

  const vendorCoins = order.original_price_coins; // Admin gets 100%
  const newBalance = (admin.virtual_balance || 0) + vendorCoins;

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: admin.id,
      type: 'earn',
      amount: vendorCoins,
      balance_before: admin.virtual_balance || 0,
      balance_after: newBalance,
      description: `VND Sale (mock) - order ${order.id.slice(0, 8)}`,
      reference_id: order.id,
      reference_type: 'order_income_vnd',
    })
    .select()
    .single();

  if (txError) {
    console.error('Error creating tx:', txError);
    return;
  }

  await supabase
    .from('users')
    .update({ virtual_balance: newBalance })
    .eq('id', admin.id);

  console.log('Transaction created:', tx.id);
  console.log('Admin balance updated to:', newBalance);
}

main();
