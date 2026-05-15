/**
 * Script to create vendor user
 * Run: node scripts/create-vendor.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createVendor() {
  rl.question('Enter vendor email (default: vendor@HMall.com): ', async (email) => {
    email = email || 'vendor@HMall.com';
    
    rl.question('Enter vendor password: ', async (password) => {
      if (!password) {
        console.log('Password is required!');
        rl.close();
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      console.log('\n=== Vendor User SQL ===');
      console.log(`INSERT INTO users (email, password_hash, full_name, role, virtual_balance)`);
      console.log(`VALUES (`);
      console.log(`    '${email}',`);
      console.log(`    '${passwordHash}',`);
      console.log(`    'Vendor User',`);
      console.log(`    'vendor',`);
      console.log(`    5000.00`);
      console.log(`);\n`);
      
      console.log('Copy the SQL above and run it in Supabase Studio or via psql');
      console.log('\nAlternatively, you can update an existing user:');
      console.log(`UPDATE users SET role = 'vendor' WHERE email = '${email}';`);
      rl.close();
    });
  });
}

createVendor();


