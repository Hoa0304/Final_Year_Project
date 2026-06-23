require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: admin } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'admin')
    .limit(1)
    .single();

  console.log('Admin:', admin.email, admin.id);

  try {
    const loginRes = await axios.post('http://localhost:3002/api/auth/login', {
      email: admin.email,
      password: 'password' // Assuming default password
    });

    const token = loginRes.data.token;
    console.log('Got token');

    const analyticsRes = await axios.get(`http://localhost:3002/api/orders/analytics?vendor_id=${admin.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Analytics Response:', JSON.stringify(analyticsRes.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

main();
