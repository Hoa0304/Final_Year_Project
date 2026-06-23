require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  console.log('Admin ID:', admin.id);

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', admin.id);

  console.log('Admin Orders:', JSON.stringify(orders, null, 2));
}

main();
