import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Starting notification translation...');

  // 1. Translate Task Completed
  const { data: tasks, error: err1 } = await supabase
    .from('notifications')
    .select('id, title, message')
    .eq('title', 'Task Completed!');

  if (tasks && tasks.length > 0) {
    console.log(`Found ${tasks.length} task notifications to translate`);
    for (const notif of tasks) {
      // Message format: You completed "Task Name" and earned X coins!
      const match = notif.message.match(/You completed "(.*?)" and earned (\d+) coins!/);
      if (match) {
        const [, taskName, coins] = match;
        await supabase.from('notifications').update({
          title: 'Hoàn thành nhiệm vụ!',
          message: `Bạn đã hoàn thành "${taskName}" và nhận được ${coins} Xu!`
        }).eq('id', notif.id);
      } else {
        await supabase.from('notifications').update({
          title: 'Hoàn thành nhiệm vụ!'
        }).eq('id', notif.id);
      }
    }
  }

  // 2. Translate Order Completed
  const { data: orders, error: err2 } = await supabase
    .from('notifications')
    .select('id, title, message')
    .eq('title', 'Order Completed');

  if (orders && orders.length > 0) {
    console.log(`Found ${orders.length} order notifications to translate`);
    for (const notif of orders) {
      // Message format: Your order for Xx ProductName has been completed successfully!
      const match = notif.message.match(/Your order for (\d+)x (.*?) has been completed successfully!/);
      if (match) {
        const [, quantity, productName] = match;
        await supabase.from('notifications').update({
          title: 'Đơn hàng hoàn tất',
          message: `Đơn hàng của bạn cho ${quantity}x ${productName} đã hoàn tất thành công!`
        }).eq('id', notif.id);
      } else {
        await supabase.from('notifications').update({
          title: 'Đơn hàng hoàn tất'
        }).eq('id', notif.id);
      }
    }
  }

  console.log('Translation complete!');
}

main().catch(console.error);
