import { supabase } from '../src/utils/supabase';
import { hashPassword } from '../src/utils/password';

async function seedVendorOrders() {
  console.log('🚀 Seeding vendor orders...');
  
  // 1. Find the vendor user (email = 'vendor@hmall.com')
  const { data: vendor, error: vendorError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'vendor@hmall.com')
    .single();

  if (vendorError || !vendor) {
    console.error('❌ Vendor vendor@hmall.com not found. Run setup-users first!');
    process.exit(1);
  }

  console.log(`✅ Found vendor: ${vendor.full_name} (${vendor.id})`);

  // 1.5. Ensure vendor has active VIP Monthly subscription
  const { data: vipPackage } = await supabase
    .from('vendor_packages')
    .select('id')
    .eq('name', 'VIP Monthly')
    .single();

  if (vipPackage) {
    console.log(`📦 Creating VIP subscription for vendor...`);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year duration
    
    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from('vendor_subscriptions')
      .select('id')
      .eq('vendor_id', vendor.id)
      .eq('package_id', vipPackage.id)
      .maybeSingle();

    if (!existingSub) {
      const { error: subError } = await supabase
        .from('vendor_subscriptions')
        .insert({
          vendor_id: vendor.id,
          package_id: vipPackage.id,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true
        });

      if (subError) {
        console.error('❌ Failed to insert vendor subscription:', subError);
      } else {
        console.log('✅ VIP subscription activated successfully!');
      }
    } else {
      console.log('✅ Vendor already has an active VIP subscription!');
    }
  } else {
    console.warn('⚠️ "VIP Monthly" package not found in vendor_packages table.');
  }

  // 2. Find or create a buyer user (email = 'buyer@hmall.com')
  let buyerId: string;
  const { data: existingBuyer } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'buyer@hmall.com')
    .single();

  if (existingBuyer) {
    buyerId = existingBuyer.id;
    console.log(`✅ Found existing buyer (ID: ${buyerId})`);
  } else {
    console.log('👤 Creating buyer@hmall.com...');
    const passwordHash = await hashPassword('buyer123');
    const { data: newBuyer, error: insertBuyerError } = await supabase
      .from('users')
      .insert({
        email: 'buyer@hmall.com',
        password_hash: passwordHash,
        full_name: 'Regular Buyer',
        role: 'user',
        virtual_balance: 10000.00
      })
      .select()
      .single();

    if (insertBuyerError || !newBuyer) {
      console.error('❌ Failed to create buyer:', insertBuyerError);
      process.exit(1);
    }
    buyerId = newBuyer.id;
    console.log(`✅ Created new buyer (ID: ${buyerId})`);
  }

  // 3. Find 5 products and make sure they belong to the vendor
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(5);

  if (productsError || !products || products.length < 5) {
    console.error('❌ Need at least 5 products in the database to run this seed.');
    process.exit(1);
  }

  console.log('📦 Updating 5 products to belong to the vendor...');
  for (const product of products) {
    const { error: updateProductError } = await supabase
      .from('products')
      .update({ created_by: vendor.id })
      .eq('id', product.id);

    if (updateProductError) {
      console.error(`❌ Failed to update product ${product.name}:`, updateProductError);
    }
  }

  // 4. Create 5 orders for these products
  const statuses = ['delivered', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
  const paymentMethods = ['coin', 'coin', 'vnd', 'coin', 'vnd'];

  console.log('🛒 Seeding 5 orders...');
  for (let i = 0; i < 5; i++) {
    const product = products[i];
    const status = statuses[i];
    const paymentMethod = paymentMethods[i];
    const quantity = i + 1; // 1, 2, 3, 4, 5
    const basePrice = product.price;

    let priceCoins = 0;
    let priceVnd = 0;
    if (paymentMethod === 'coin') {
      priceCoins = Math.round(basePrice * quantity * 0.9);
    } else {
      priceVnd = basePrice * 100 * quantity;
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4 - i);

    const orderData: any = {
      user_id: buyerId,
      vendor_id: vendor.id,
      product_id: product.id,
      quantity,
      payment_method: paymentMethod,
      price_coins: priceCoins,
      price_vnd: priceVnd,
      original_price_coins: Math.round(basePrice * quantity),
      discount_applied: paymentMethod === 'coin' ? 10 : 0,
      status,
      estimated_delivery: estimatedDelivery.toISOString(),
      delivery_address: `123 Main St, Appt ${i + 1}, HMall City`,
      notes: `Please deliver package during business hours. Seed order #${i + 1}`,
      paid_at: new Date().toISOString(),
    };

    let { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.warn(`⚠️ Warning: Status "${status}" failed with error: ${orderError.message}. Retrying with fallback status...`);
      // Fallback to basic DB constraints: completed or pending
      orderData.status = (status === 'delivered' || status === 'processing' || status === 'shipped' || status === 'out_for_delivery') ? 'completed' : 'pending';
      const retryResult = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (retryResult.error) {
        console.error(`❌ Retry failed for product ${product.name}:`, retryResult.error);
        continue;
      }
      order = retryResult.data;
    }

    console.log(`   ✅ Order ${i + 1} created: ID ${order.id}, Status: ${order.status}`);

    // Create spending transaction for buyer (if coin payment)
    if (paymentMethod === 'coin') {
      await supabase.from('transactions').insert({
        user_id: buyerId,
        type: 'spend',
        amount: priceCoins,
        balance_before: 10000 - priceCoins,
        balance_after: 10000 - priceCoins * 2,
        description: `Seed purchase: ${product.name} x${quantity}`,
        reference_id: order.id,
        reference_type: 'order',
      });

      // Create earning transaction for vendor
      const vendorEarn = Math.round(priceCoins * 0.9);
      await supabase.from('transactions').insert({
        user_id: vendor.id,
        type: 'earn',
        amount: vendorEarn,
        balance_before: vendor.virtual_balance,
        balance_after: vendor.virtual_balance + vendorEarn,
        description: `Seed sale: ${product.name} x${quantity}`,
        reference_id: order.id,
        reference_type: 'order_income',
      });
    } else {
      // VND Transaction - earn for vendor
      const vendorEarn = Math.round((priceVnd / 100) * 0.9);
      await supabase.from('transactions').insert({
        user_id: vendor.id,
        type: 'earn',
        amount: vendorEarn,
        balance_before: vendor.virtual_balance,
        balance_after: vendor.virtual_balance + vendorEarn,
        description: `Seed VND sale: ${product.name} x${quantity}`,
        reference_id: order.id,
        reference_type: 'order_income_vnd',
      });
    }

    // Create notifications for vendor
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: vendor.id,
        type: 'order_placed',
        priority: 'medium',
        title: 'New Order Placed!',
        message: `A client placed a new order for ${product.name} (x${quantity})`,
        data: { orderId: order.id },
      })
      .select()
      .single();

    if (!notifError && notification) {
      await supabase.from('notification_history').insert({
        notification_id: notification.id,
        user_id: vendor.id,
        channel: 'in_app',
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      });
    }
  }

  console.log('✨ Seeding completed successfully!');
  process.exit(0);
}

seedVendorOrders();
