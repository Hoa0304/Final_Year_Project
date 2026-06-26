const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: tasks } = await supabase.from('tasks').select('title, description');
  console.log('TASKS:', JSON.stringify(tasks, null, 2));

  const { data: txs } = await supabase.from('transactions').select('description').not('description', 'is', null).limit(100);
  const uniqueDesc = [...new Set(txs.map(t => t.description))];
  console.log('TX DESCS:', JSON.stringify(uniqueDesc, null, 2));
}
run();
