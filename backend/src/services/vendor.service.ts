import { supabase } from '../utils/supabase';

/**
 * Interface for Vendor Limits
 */
export interface VendorLimits {
  productLimit: number;
  categoryLimit: number;
  currentProducts: number;
  currentCategories: number;
  canPostProduct: boolean;
  canUseCategory: (category: string) => Promise<boolean>;
}

/**
 * Get current limits and usage for a vendor
 * @param vendorId UUID of the vendor
 */
export async function getVendorLimits(vendorId: string): Promise<VendorLimits> {
  // 1. Get current subscription and package
  const { data: subscription } = await supabase
    .from('vendor_subscriptions')
    .select('*, vendor_packages(*)')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .single();

  // 2. Default limits (Free tier) if no active subscription
  let productLimit = 1;
  let categoryLimit = 1;

  if (subscription && subscription.vendor_packages) {
    productLimit = subscription.vendor_packages.product_limit;
    categoryLimit = subscription.vendor_packages.category_limit;
  }

  // 3. Get current usage
  // For product limit (user requested "Each week only 1 product" for free tier)
  // We'll check products created in the last 7 days for the free tier
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { count: productsThisWeek } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', vendorId)
    .gte('created_at', oneWeekAgo.toISOString());

  const { data: allProducts } = await supabase
    .from('products')
    .select('category')
    .eq('created_by', vendorId)
    .eq('is_active', true);

  const currentCategories = new Set(allProducts?.map(p => p.category).filter(Boolean)).size;

  const canPostProduct = productLimit === -1 || (productsThisWeek || 0) < productLimit;

  return {
    productLimit,
    categoryLimit,
    currentProducts: productsThisWeek || 0,
    currentCategories,
    canPostProduct,
    canUseCategory: async (category: string) => {
      if (categoryLimit === -1) return true;
      
      const uniqueCategories = new Set(allProducts?.map(p => p.category).filter(Boolean));
      if (uniqueCategories.has(category)) return true;
      
      return uniqueCategories.size < categoryLimit;
    }
  };
}

/**
 * Initialize vendor profile if not exists
 */
export async function ensureVendorProfile(userId: string) {
  const { data: profile } = await supabase
    .from('vendor_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    await supabase.from('vendor_profiles').insert({
      user_id: userId,
      business_name: 'My Store',
      is_verified: false
    });
  }
}
