require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_ID = '3d03baf4-235a-484b-bd69-b2f5e343352b';

async function main() {
  try {
    console.log('1. Fetching all orders...');
    const { data: orders, error: ordersErr } = await supabase.from('orders').select('*');
    if (ordersErr) throw ordersErr;

    console.log(`Found ${orders.length} orders. Generating transactions...`);

    // First delete any existing order-related transactions to avoid duplicates
    await supabase.from('transactions').delete().in('reference_type', ['order', 'order_income']);

    const transactionsToInsert = [];

    for (const order of orders) {
      // If user spent coins
      if (order.price_coins > 0) {
        transactionsToInsert.push({
          id: uuidv4(),
          user_id: order.user_id,
          type: 'spend',
          amount: order.price_coins,
          description: `Seeded Coin Spend for Order`,
          reference_id: order.id,
          reference_type: 'order',
          created_at: order.created_at,
          created_by: order.user_id,
          balance_before: 0,
          balance_after: 0
        });
      }

      // If fully paid with coins, vendor earns
      if (order.price_vnd === 0 && order.price_coins > 0 && order.vendor_id) {
        const isVendorAdmin = order.vendor_id === ADMIN_ID;
        const totalVnd = order.original_price_coins;
        const earnAmount = isVendorAdmin ? totalVnd : Math.round(totalVnd * 0.9);
        
        transactionsToInsert.push({
          id: uuidv4(),
          user_id: order.vendor_id,
          type: 'earn',
          amount: earnAmount,
          description: `Seeded Sale Earn for Order`,
          reference_id: order.id,
          reference_type: 'order_income',
          created_at: order.created_at,
          created_by: order.vendor_id, // created_by is usually the system or user
          balance_before: 0,
          balance_after: 0
        });
      }
    }

    console.log(`Inserting ${transactionsToInsert.length} transactions...`);
    const CHUNK_SIZE = 500;
    for (let i = 0; i < transactionsToInsert.length; i += CHUNK_SIZE) {
      const chunk = transactionsToInsert.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('transactions').insert(chunk);
      if (error) console.error('Insert Error:', error);
    }

    console.log('2. Recalculating user virtual balances...');
    const { data: allTransactions, error: tErr } = await supabase.from('transactions').select('user_id, type, amount');
    if (tErr) throw tErr;

    const balances = {}; // userId -> balance
    
    // Some users might have a base balance from topup, let's just aggregate all transactions
    for (const t of allTransactions) {
      if (!balances[t.user_id]) balances[t.user_id] = 0;
      
      if (['earn', 'topup', 'transfer_in'].includes(t.type)) {
        balances[t.user_id] += t.amount;
      } else if (['spend', 'transfer_out'].includes(t.type)) {
        balances[t.user_id] -= t.amount;
      }
    }

    // Assign some random baseline balances so users don't have negative balances 
    // (since they just spent coins without topping up in our seed script)
    const { data: users } = await supabase.from('users').select('id, virtual_balance, role');
    for (const u of users) {
      let b = balances[u.id] || 0;
      // If balance is negative, give them a topup to make it positive
      if (b < 0) {
        const topupAmount = Math.abs(b) + Math.floor(Math.random() * 50000);
        await supabase.from('transactions').insert({
          user_id: u.id,
          type: 'topup',
          amount: topupAmount,
          description: 'Seeded Initial Topup',
          balance_before: 0,
          balance_after: topupAmount
        });
        b += topupAmount;
      } else if (b === 0 && u.role === 'user') {
        b = Math.floor(Math.random() * 100000); // Give random users some balance
      }
      
      await supabase.from('users').update({ virtual_balance: b }).eq('id', u.id);
    }

    console.log('✅ Finished updating transactions and balances!');

  } catch (err) {
    console.error('Script Error:', err);
  }
}

main();
