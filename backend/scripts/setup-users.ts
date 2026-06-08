import { supabase } from '../src/utils/supabase';
import { hashPassword } from '../src/utils/password';

async function setupUsers() {
  console.log('🚀 Starting initial user setup...');

  const users = [
    {
      email: 'admin@hmall.com',
      password: 'admin123',
      fullName: 'Super Admin',
      role: 'admin',
      balance: 100000.00
    },
    {
      email: 'vendor@hmall.com',
      password: 'vendor123',
      fullName: 'Vendor User',
      role: 'vendor',
      balance: 5000.00
    },
    {
      email: 'buyer@hmall.com',
      password: 'buyer123',
      fullName: 'Buyer User',
      role: 'user',
      balance: 10000.00
    }
  ];

  for (const userData of users) {
    try {
      console.log(`\n👤 Processing ${userData.role}: ${userData.email}...`);

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      const passwordHash = await hashPassword(userData.password);

      if (existingUser) {
        console.log(`   Found existing user (ID: ${existingUser.id}), updating role and password...`);
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: userData.role,
            password_hash: passwordHash,
            full_name: userData.fullName,
            virtual_balance: userData.balance
          })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;
        console.log(`   ✅ Successfully updated ${userData.email}`);
      } else {
        console.log(`   User not found, creating new ${userData.role}...`);
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            email: userData.email,
            password_hash: passwordHash,
            full_name: userData.fullName,
            role: userData.role,
            virtual_balance: userData.balance
          });

        if (insertError) throw insertError;
        console.log(`   ✅ Successfully created ${userData.email}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing ${userData.email}:`, error.message);
    }
  }

  console.log('\n✨ Setup completed!');
  process.exit(0);
}

setupUsers();
