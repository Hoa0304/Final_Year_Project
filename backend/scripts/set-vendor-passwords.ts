import { supabase } from '../src/utils/supabase';
import { hashPassword } from '../src/utils/password';

async function setPasswords() {
  console.log('Setting password for vendors to "password"...');
  
  const emails = [
    'vendor@hmall.com',
    'techstore@hmall.com',
    'fashionhub@hmall.com',
    'bookwormbooks@hmall.com',
    'homecozy@hmall.com',
    'sportsworld@hmall.com',
    'foodshop@hmall.com',
    'drinkshop@hmall.com'
  ];

  const newHash = await hashPassword('password');

  for (const email of emails) {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('email', email);

    if (error) {
      console.error(`Error updating ${email}:`, error.message);
    } else {
      console.log(`Successfully updated password for ${email}`);
    }
  }

  // Also update any other vendor just in case
  const { error: vendorError } = await supabase
    .from('users')
    .update({ password_hash: newHash })
    .eq('role', 'vendor');

  if (vendorError) {
    console.error('Error updating all vendors:', vendorError.message);
  } else {
    console.log('Successfully updated password for all vendors');
  }

  console.log('Done.');
  process.exit(0);
}

setPasswords();
