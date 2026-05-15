/**
 * Script to create admin user
 * Run: node scripts/create-admin.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  rl.question('Enter admin email (default: admin@HMall.com): ', async (email) => {
    email = email || 'admin@HMall.com';
    
    rl.question('Enter admin password: ', async (password) => {
      if (!password) {
        console.log('Password is required!');
        rl.close();
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      console.log('\n=== Admin User SQL ===');
      console.log(`INSERT INTO users (email, password_hash, full_name, role, virtual_balance)`);
      console.log(`VALUES (`);
      console.log(`    '${email}',`);
      console.log(`    '${passwordHash}',`);
      console.log(`    'Admin User',`);
      console.log(`    'admin',`);
      console.log(`    100000.00`);
      console.log(`);\n`);
      
      console.log('Copy the SQL above and run it in Supabase Studio or via psql');
      rl.close();
    });
  });
}

createAdmin();



