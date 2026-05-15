import { supabase } from '../src/utils/supabase';

async function updateDbBranding() {
  console.log('🚀 Starting database branding update...');

  try {
    // 1. Update user emails
    console.log('📧 Updating user emails...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');

    if (usersError) throw usersError;

    for (const user of users) {
      if (user.email.includes('@HMall.com')) {
        const newEmail = user.email.replace('@HMall.com', '@hmall.com');
        console.log(`   Updating ${user.email} -> ${newEmail}`);
        const { error: updateError } = await supabase
          .from('users')
          .update({ email: newEmail })
          .eq('id', user.id);
        if (updateError) console.error(`   ❌ Failed to update ${user.email}:`, updateError.message);
      }
    }

    // 2. Update product names and descriptions
    console.log('\n📦 Updating product names and descriptions...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, description');

    if (productsError) throw productsError;

    for (const product of products) {
      let updated = false;
      const updates: any = {};

      if (product.name.includes('HMall')) {
        updates.name = product.name.replace(/HMall/g, 'HMall');
        updated = true;
      }
      if (product.description && product.description.includes('HMall')) {
        updates.description = product.description.replace(/HMall/g, 'HMall');
        updated = true;
      }

      if (updated) {
        console.log(`   Updating product ${product.name}...`);
        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id);
        if (updateError) console.error(`   ❌ Failed to update product ${product.id}:`, updateError.message);
      }
    }

    // 3. Update task titles and descriptions
    console.log('\n📋 Updating task titles and descriptions...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description');

    if (tasksError) throw tasksError;

    for (const task of tasks) {
      let updated = false;
      const updates: any = {};

      if (task.title.includes('HMall')) {
        updates.title = task.title.replace(/HMall/g, 'HMall');
        updated = true;
      }
      if (task.description && task.description.includes('HMall')) {
        updates.description = task.description.replace(/HMall/g, 'HMall');
        updated = true;
      }

      if (updated) {
        console.log(`   Updating task ${task.title}...`);
        const { error: updateError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', task.id);
        if (updateError) console.error(`   ❌ Failed to update task ${task.id}:`, updateError.message);
      }
    }

    console.log('\n✨ Database branding update completed!');
  } catch (error: any) {
    console.error('\n❌ Error during database update:', error.message);
  }

  process.exit(0);
}

updateDbBranding();

