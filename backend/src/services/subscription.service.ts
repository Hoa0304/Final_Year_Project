import { supabase } from '../utils/supabase';

/**
 * Activate or renew a vendor subscription
 */
export async function activateSubscription(vendorId: string, packageId: string) {
  // 1. Get package details
  const { data: pkg } = await supabase
    .from('vendor_packages')
    .select('*')
    .eq('id', packageId)
    .single();

  if (!pkg) throw new Error('Package not found');

  // 2. Calculate end date (assume monthly for now, or based on pkg)
  const startDate = new Date();
  const endDate = new Date();
  
  if (pkg.name.toLowerCase().includes('year')) {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // 3. Upsert subscription
  const { data: existingSub } = await supabase
    .from('vendor_subscriptions')
    .select('id, end_date')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .single();

  if (existingSub) {
    // Extend existing
    const currentEnd = new Date(existingSub.end_date);
    const newEnd = currentEnd > startDate ? currentEnd : startDate;
    
    if (pkg.name.toLowerCase().includes('year')) {
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    } else {
      newEnd.setMonth(newEnd.getMonth() + 1);
    }

    await supabase
      .from('vendor_subscriptions')
      .update({ end_date: newEnd.toISOString() })
      .eq('id', existingSub.id);
  } else {
    // Create new
    await supabase.from('vendor_subscriptions').insert({
      vendor_id: vendorId,
      package_id: packageId,
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      auto_renew: true
    });
  }

  // 4. Update user role if needed (ensure they are 'vendor')
  await supabase.from('users').update({ role: 'vendor' }).eq('id', vendorId);
}

/**
 * Check and deactivate expired subscriptions
 */
export async function checkExpiredSubscriptions() {
  const now = new Date().toISOString();
  
  const { data: expired } = await supabase
    .from('vendor_subscriptions')
    .update({ status: 'expired' })
    .lt('end_date', now)
    .eq('status', 'active')
    .select('vendor_id');

  return expired;
}
