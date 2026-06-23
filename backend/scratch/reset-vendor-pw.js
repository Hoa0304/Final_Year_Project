const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resetVendorPasswords() {
  const { data, error } = await supabase
    .from('users')
    .update({ password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' })
    .eq('role', 'vendor');
    
  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log('Successfully updated vendor passwords to "password"');
  }
}
resetVendorPasswords();
