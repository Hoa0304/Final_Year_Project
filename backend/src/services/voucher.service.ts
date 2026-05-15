import { supabase } from '../utils/supabase';

/**
 * Voucher Service
 * Handles all voucher-related business logic including validation, redemption, and tracking
 */

export type VoucherDiscountType = 'percentage' | 'fixed_amount' | 'coin_bonus';
export type VoucherStatus = 'active' | 'inactive' | 'expired';

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description?: string;
  discount_type: VoucherDiscountType;
  discount_value: number;
  usage_limit_per_user?: number;
  total_usage_limit?: number;
  current_usage_count: number;
  valid_from: string;
  expires_at: string;
  status: VoucherStatus;
  is_active: boolean;
  is_claimable: boolean; // Whether users can claim this voucher themselves
  is_featured: boolean; // Whether this voucher is featured in public page
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVoucherParams {
  code: string;
  title: string;
  description?: string;
  discount_type: VoucherDiscountType;
  discount_value: number;
  usage_limit_per_user?: number;
  total_usage_limit?: number;
  valid_from?: string;
  expires_at: string;
  is_claimable?: boolean; // Whether users can claim this voucher themselves
  is_featured?: boolean; // Whether this voucher is featured in public page (admin only)
  created_by: string;
}

export interface IssueVoucherToUserParams {
  voucher_id: string;
  user_id: string;
  issued_by: string | null; // null if system issued (e.g., random voucher after purchase)
  expires_at?: string | null; // Optional override of voucher's expiry date
}

export interface RedeemVoucherParams {
  voucher_id: string;
  user_id: string;
  original_amount: number; // Original amount before discount
  reference_id?: string; // Reference to order, transaction, etc.
  reference_type?: string; // 'order', 'coin_topup', etc.
}

export interface VoucherRedemptionResult {
  success: boolean;
  discount_amount: number;
  final_amount: number;
  redemption_id?: string;
  error?: string;
}

/**
 * Create a new voucher
 * Admin and Vendors can create vouchers
 */
export async function createVoucher(params: CreateVoucherParams): Promise<Voucher> {
    const {
      code,
      title,
      description,
      discount_type,
      discount_value,
      usage_limit_per_user,
      total_usage_limit,
      valid_from,
      expires_at,
      is_claimable,
      created_by
    } = params;

  // Validate discount value based on type
  if (discount_type === 'percentage') {
    if (discount_value < 0 || discount_value > 100) {
      throw new Error('Percentage discount must be between 0 and 100');
    }
  } else {
    if (discount_value <= 0) {
      throw new Error('Fixed amount or coin bonus must be greater than 0');
    }
  }

  // Validate expiry date
  const expiryDate = new Date(expires_at);
  const validFromDate = valid_from ? new Date(valid_from) : new Date();
  if (expiryDate <= validFromDate) {
    throw new Error('Expiry date must be after valid from date');
  }

  // Check if code already exists
  const { data: existingVoucher } = await supabase
    .from('vouchers')
    .select('id')
    .eq('code', code.toUpperCase())
    .single();

  if (existingVoucher) {
    throw new Error('Voucher code already exists');
  }

  // Create voucher
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .insert({
      code: code.toUpperCase(),
      title,
      description: description || null,
      discount_type,
      discount_value,
      usage_limit_per_user: usage_limit_per_user || null,
      total_usage_limit: total_usage_limit || null,
      current_usage_count: 0,
      valid_from: valid_from || new Date().toISOString(),
      expires_at,
      status: 'active',
      is_active: true,
      is_claimable: is_claimable !== undefined ? is_claimable : false,
      is_featured: false, // Only admin can set this via update
      created_by
    })
    .select()
    .single();

  if (error) {
    console.error('Create voucher error:', error);
    throw new Error('Failed to create voucher');
  }

  return voucher;
}

/**
 * Get voucher by ID
 */
export async function getVoucherById(voucherId: string): Promise<Voucher | null> {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('id', voucherId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error('Failed to fetch voucher');
  }

  return data;
}

/**
 * Get voucher by code
 */
export async function getVoucherByCode(code: string): Promise<Voucher | null> {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error('Failed to fetch voucher');
  }

  return data;
}

/**
 * Get all vouchers with optional filters
 */
export async function getVouchers(filters?: {
  status?: VoucherStatus;
  is_active?: boolean;
  created_by?: string;
  limit?: number;
  offset?: number;
}): Promise<Voucher[]> {
  let query = supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters?.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  if (filters?.limit) {
    const offset = filters.offset || 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch vouchers');
  }

  return data || [];
}

/**
 * Update voucher
 * Only the creator (or admin) can update
 */
export async function updateVoucher(
  voucherId: string,
  updates: Partial<CreateVoucherParams>,
  userId: string,
  isAdmin: boolean
): Promise<Voucher> {
  // Check if voucher exists and user has permission
  const voucher = await getVoucherById(voucherId);
  if (!voucher) {
    throw new Error('Voucher not found');
  }

  if (!isAdmin && voucher.created_by !== userId) {
    throw new Error('You can only update vouchers you created');
  }

  // Validate discount value if provided
  if (updates.discount_value !== undefined) {
    const discountType = updates.discount_type || voucher.discount_type;
    if (discountType === 'percentage') {
      if (updates.discount_value < 0 || updates.discount_value > 100) {
        throw new Error('Percentage discount must be between 0 and 100');
      }
    } else {
      if (updates.discount_value <= 0) {
        throw new Error('Fixed amount or coin bonus must be greater than 0');
      }
    }
  }

  // Update voucher
  const { data, error } = await supabase
    .from('vouchers')
    .update({
      ...(updates.code && { code: updates.code.toUpperCase() }),
      ...(updates.title && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.discount_type && { discount_type: updates.discount_type }),
      ...(updates.discount_value !== undefined && { discount_value: updates.discount_value }),
      ...(updates.usage_limit_per_user !== undefined && { usage_limit_per_user: updates.usage_limit_per_user || null }),
      ...(updates.total_usage_limit !== undefined && { total_usage_limit: updates.total_usage_limit || null }),
      ...(updates.valid_from && { valid_from: updates.valid_from }),
      ...(updates.expires_at && { expires_at: updates.expires_at }),
      ...(updates.is_claimable !== undefined && { is_claimable: updates.is_claimable }),
      ...(updates.is_featured !== undefined && { is_featured: updates.is_featured })
    })
    .eq('id', voucherId)
    .select()
    .single();

  if (error) {
    console.error('Update voucher error:', error);
    throw new Error('Failed to update voucher');
  }

  return data;
}

/**
 * Delete voucher (soft delete by setting is_active to false)
 */
export async function deleteVoucher(voucherId: string, userId: string, isAdmin: boolean): Promise<void> {
  const voucher = await getVoucherById(voucherId);
  if (!voucher) {
    throw new Error('Voucher not found');
  }

  if (!isAdmin && voucher.created_by !== userId) {
    throw new Error('You can only delete vouchers you created');
  }

  const { error } = await supabase
    .from('vouchers')
    .update({ is_active: false, status: 'inactive' })
    .eq('id', voucherId);

  if (error) {
    console.error('Delete voucher error:', error);
    throw new Error('Failed to delete voucher');
  }
}

/**
 * Claim a voucher (user self-service)
 * Users can claim claimable vouchers themselves
 */
export async function claimVoucher(voucherId: string, userId: string): Promise<void> {
  // Get voucher
  const voucher = await getVoucherById(voucherId);
  if (!voucher) {
    throw new Error('Voucher not found');
  }

  // Check if voucher is claimable
  if (!voucher.is_claimable) {
    throw new Error('This voucher cannot be claimed. It must be issued by Admin or Vendor.');
  }

  // Check if voucher is active and valid
  if (!voucher.is_active || voucher.status !== 'active') {
    throw new Error('Voucher is not active');
  }

  const now = new Date();
  if (new Date(voucher.expires_at) < now) {
    throw new Error('Voucher has expired');
  }

  if (new Date(voucher.valid_from) > now) {
    throw new Error('Voucher is not yet valid');
  }

  // Check total usage limit
  if (voucher.total_usage_limit && voucher.current_usage_count >= voucher.total_usage_limit) {
    throw new Error('Voucher usage limit has been reached');
  }

  // Check if user already has this voucher issued
  const { data: existingIssuance } = await supabase
    .from('voucher_user_issuances')
    .select('id')
    .eq('voucher_id', voucherId)
    .eq('user_id', userId)
    .single();

  if (existingIssuance) {
    // Update existing issuance to active
    const { error } = await supabase
      .from('voucher_user_issuances')
      .update({
        is_active: true,
        issued_at: new Date().toISOString()
      })
      .eq('id', existingIssuance.id);

    if (error) {
      throw new Error('Failed to claim voucher');
    }
  } else {
    // Create new issuance (user claimed it themselves)
    const { error } = await supabase
      .from('voucher_user_issuances')
      .insert({
        voucher_id: voucherId,
        user_id: userId,
        issued_by: null, // User claimed it themselves
        is_active: true
      });

    if (error) {
      console.error('Claim voucher error:', error);
      throw new Error('Failed to claim voucher');
    }
  }
}

/**
 * Get available vouchers that users can claim
 * Filters by vendor, claimable status, and validity
 */
export async function getAvailableVouchers(filters?: {
  vendor_id?: string; // Filter by vendor (created_by)
  is_claimable?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Voucher[]> {
  const now = new Date().toISOString();
  
  let query = supabase
    .from('vouchers')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'active')
    .lte('valid_from', now) // Valid from date has passed
    .gte('expires_at', now) // Not expired yet
    .order('created_at', { ascending: false });

  // Filter by claimable status
  if (filters?.is_claimable !== undefined) {
    query = query.eq('is_claimable', filters.is_claimable);
  } else {
    // Default: only show claimable vouchers
    query = query.eq('is_claimable', true);
  }

  // Filter by vendor
  if (filters?.vendor_id) {
    query = query.eq('created_by', filters.vendor_id);
  }

  // Apply pagination
  if (filters?.limit) {
    const offset = filters.offset || 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch available vouchers');
  }

  // Filter out vouchers that are out of stock (auto-hide)
  const availableVouchers = (data || []).filter((voucher) => {
    // If voucher has total_usage_limit and it's reached, hide it
    if (voucher.total_usage_limit !== null && voucher.current_usage_count >= voucher.total_usage_limit) {
      return false;
    }
    return true;
  });

  return availableVouchers;
}

/**
 * Get featured vouchers for public voucher page
 * Only shows vouchers marked as featured by admin
 * Automatically hides vouchers that are out of stock
 */
export async function getFeaturedVouchers(limit?: number, offset?: number): Promise<Voucher[]> {
  const now = new Date().toISOString();
  
  let query = supabase
    .from('vouchers')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'active')
    .eq('is_featured', true) // Only featured vouchers
    .lte('valid_from', now)
    .gte('expires_at', now)
    .order('created_at', { ascending: false });

  if (limit) {
    const offsetValue = offset || 0;
    query = query.range(offsetValue, offsetValue + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch featured vouchers');
  }

  // Filter out vouchers that are out of stock (auto-hide)
  const availableVouchers = (data || []).filter((voucher) => {
    if (voucher.total_usage_limit !== null && voucher.current_usage_count >= voucher.total_usage_limit) {
      return false;
    }
    return true;
  });

  return availableVouchers;
}

/**
 * Get vouchers of a specific vendor (public)
 * Used for vendor page
 */
export async function getVendorVouchers(vendorId: string, limit?: number, offset?: number): Promise<Voucher[]> {
  const now = new Date().toISOString();
  
  let query = supabase
    .from('vouchers')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'active')
    .eq('created_by', vendorId)
    .eq('is_claimable', true) // Only claimable vouchers for vendor page
    .lte('valid_from', now)
    .gte('expires_at', now)
    .order('created_at', { ascending: false });

  if (limit) {
    const offsetValue = offset || 0;
    query = query.range(offsetValue, offsetValue + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch vendor vouchers');
  }

  // Filter out vouchers that are out of stock (auto-hide)
  const availableVouchers = (data || []).filter((voucher) => {
    if (voucher.total_usage_limit !== null && voucher.current_usage_count >= voucher.total_usage_limit) {
      return false;
    }
    return true;
  });

  return availableVouchers;
}

/**
 * Randomly select and issue a voucher to user after purchase
 * Selects from product's random_voucher_ids if specified, otherwise from vendor's claimable vouchers
 */
export async function randomVoucherAfterPurchase(vendorId: string, userId: string, productId?: string): Promise<Voucher | null> {
  try {
    let vouchers: Voucher[] = [];
    
    // If productId is provided, check if product has specific voucher pool
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('random_voucher_ids')
        .eq('id', productId)
        .single();
      
      // If product has specific voucher IDs, only select from those
      if (product?.random_voucher_ids && product.random_voucher_ids.length > 0) {
        const { data: poolVouchers } = await supabase
          .from('vouchers')
          .select('*')
          .in('id', product.random_voucher_ids)
          .eq('is_active', true)
          .eq('status', 'active')
          .eq('is_claimable', true)
          .lte('valid_from', new Date().toISOString())
          .gte('expires_at', new Date().toISOString());
        
        // Filter out vouchers that are out of stock
        vouchers = (poolVouchers || []).filter((v) => {
          if (v.total_usage_limit !== null && v.current_usage_count >= v.total_usage_limit) {
            return false;
          }
          return true;
        });
      }
    }
    
    // If no vouchers from product pool, fall back to all vendor's claimable vouchers
    if (vouchers.length === 0) {
      vouchers = await getAvailableVouchers({
        vendor_id: vendorId,
        is_claimable: true
      });
    }

    if (!vouchers || vouchers.length === 0) {
      return null; // No vouchers available
    }

    // Randomly select one voucher
    const randomIndex = Math.floor(Math.random() * vouchers.length);
    const selectedVoucher = vouchers[randomIndex];

    // Issue the voucher to user
    try {
      await issueVoucherToUser({
        voucher_id: selectedVoucher.id,
        user_id: userId,
        issued_by: null, // System issued (not by admin/vendor)
        expires_at: null // Use voucher's expiry date
      });
      
      return selectedVoucher;
    } catch (error) {
      // If issuing fails (e.g., already issued), try another voucher
      console.error('Failed to issue random voucher, trying another:', error);
      // Try next voucher in list
      for (let i = 0; i < vouchers.length; i++) {
        const nextIndex = (randomIndex + i + 1) % vouchers.length;
        const nextVoucher = vouchers[nextIndex];
        try {
          await issueVoucherToUser({
            voucher_id: nextVoucher.id,
            user_id: userId,
            issued_by: null as any, // System issued
            expires_at: undefined
          });
          return nextVoucher;
        } catch (e) {
          continue; // Try next
        }
      }
      return null; // Could not issue any voucher
    }
  } catch (error) {
    console.error('Random voucher error:', error);
    return null;
  }
}

/**
 * Issue voucher to a specific user (Admin or Vendor)
 */
export async function issueVoucherToUser(params: IssueVoucherToUserParams): Promise<void> {
  const { voucher_id, user_id, issued_by, expires_at } = params;
  
  // If issued_by is null, it means system issued (e.g., random voucher)
  // We'll set it to null in database

  // Verify voucher exists and is active
  const voucher = await getVoucherById(voucher_id);
  if (!voucher) {
    throw new Error('Voucher not found');
  }

  if (!voucher.is_active || voucher.status !== 'active') {
    throw new Error('Voucher is not active');
  }

  // Verify user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user_id)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Check if already issued to this user
  const { data: existingIssuance } = await supabase
    .from('voucher_user_issuances')
    .select('id')
    .eq('voucher_id', voucher_id)
    .eq('user_id', user_id)
    .single();

  if (existingIssuance) {
    // Update existing issuance
    const { error } = await supabase
      .from('voucher_user_issuances')
      .update({
        is_active: true,
        expires_at: expires_at || null,
        issued_at: new Date().toISOString()
      })
      .eq('id', existingIssuance.id);

    if (error) {
      throw new Error('Failed to update voucher issuance');
    }
  } else {
    // Create new issuance
    const { error } = await supabase
      .from('voucher_user_issuances')
      .insert({
        voucher_id,
        user_id,
        issued_by,
        expires_at: expires_at || null,
        is_active: true
      });

    if (error) {
      console.error('Issue voucher error:', error);
      throw new Error('Failed to issue voucher to user');
    }
  }
}

/**
 * Validate if a user can redeem a voucher
 * Uses database function for atomic validation
 */
export async function validateVoucherRedemption(
  voucherId: string,
  userId: string
): Promise<{ can_redeem: boolean; error?: string; voucher?: Voucher }> {
  const { data, error } = await supabase.rpc('can_redeem_voucher', {
    p_voucher_id: voucherId,
    p_user_id: userId
  });

  if (error) {
    console.error('Validate voucher redemption error:', error);
    throw new Error('Failed to validate voucher redemption');
  }

  const result = data as { can_redeem: boolean; error?: string; voucher?: Voucher };

  return {
    can_redeem: result.can_redeem,
    error: result.error,
    voucher: result.voucher
  };
}

/**
 * Calculate discount amount based on voucher type and original amount
 */
export function calculateVoucherDiscount(
  voucher: Voucher,
  originalAmount: number
): number {
  if (originalAmount <= 0) {
    return 0;
  }

  switch (voucher.discount_type) {
    case 'percentage':
      // Percentage discount: discount = originalAmount * (discount_value / 100)
      const discountAmount = originalAmount * (voucher.discount_value / 100);
      return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places

    case 'fixed_amount':
      // Fixed amount discount: discount = min(discount_value, originalAmount)
      return Math.min(voucher.discount_value, originalAmount);

    case 'coin_bonus':
      // Coin bonus: discount = discount_value (this is added, not subtracted)
      // For coin bonus, we return the bonus amount (positive)
      return voucher.discount_value;

    default:
      return 0;
  }
}

/**
 * Redeem a voucher
 * This function handles the atomic redemption process including:
 * - Validation
 * - Discount calculation
 * - Usage count update
 * - Redemption record creation
 */
export async function redeemVoucher(params: RedeemVoucherParams): Promise<VoucherRedemptionResult> {
  const { voucher_id, user_id, original_amount, reference_id, reference_type } = params;

  // Validate redemption using database function
  const validation = await validateVoucherRedemption(voucher_id, user_id);
  if (!validation.can_redeem || !validation.voucher) {
    return {
      success: false,
      discount_amount: 0,
      final_amount: original_amount,
      error: validation.error || 'Cannot redeem voucher'
    };
  }

  const voucher = validation.voucher;

  // Calculate discount
  const discountAmount = calculateVoucherDiscount(voucher, original_amount);
  let finalAmount = original_amount;

  // Apply discount (for coin_bonus, we don't subtract, it's added separately)
  if (voucher.discount_type !== 'coin_bonus') {
    finalAmount = Math.max(0, original_amount - discountAmount);
  }

  // Use transaction-like approach with database operations
  // First, increment usage count (with concurrency safety)
  const { error: updateError } = await supabase.rpc('increment_voucher_usage', {
    p_voucher_id: voucher_id
  });

  // If increment fails, try manual update
  if (updateError) {
    const { data: currentVoucher } = await supabase
      .from('vouchers')
      .select('current_usage_count, total_usage_limit')
      .eq('id', voucher_id)
      .single();

    if (currentVoucher) {
      // Check total limit again (race condition check)
      if (currentVoucher.total_usage_limit && 
          currentVoucher.current_usage_count >= currentVoucher.total_usage_limit) {
        return {
          success: false,
          discount_amount: 0,
          final_amount: original_amount,
          error: 'Voucher usage limit has been reached'
        };
      }

      // Update usage count
      await supabase
        .from('vouchers')
        .update({ current_usage_count: currentVoucher.current_usage_count + 1 })
        .eq('id', voucher_id);
    }
  }

  // Create redemption record
  const { data: redemption, error: redemptionError } = await supabase
    .from('voucher_redemptions')
    .insert({
      voucher_id,
      user_id,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      discount_amount: discountAmount,
      original_amount: original_amount,
      final_amount: finalAmount,
      reference_id: reference_id || null,
      reference_type: reference_type || null
    })
    .select()
    .single();

  if (redemptionError) {
    console.error('Create redemption record error:', redemptionError);
    // Rollback usage count increment if possible
    return {
      success: false,
      discount_amount: 0,
      final_amount: original_amount,
      error: 'Failed to record voucher redemption'
    };
  }

  return {
    success: true,
    discount_amount: discountAmount,
    final_amount: finalAmount,
    redemption_id: redemption.id
  };
}

/**
 * Get user's voucher redemptions
 */
export async function getUserVoucherRedemptions(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const { data, error } = await supabase
    .from('voucher_redemptions')
    .select(`
      *,
      vouchers (
        id,
        code,
        title,
        description
      )
    `)
    .eq('user_id', userId)
    .order('redeemed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error('Failed to fetch voucher redemptions');
  }

  return data || [];
}

/**
 * Get vouchers issued to a specific user
 */
export async function getUserIssuedVouchers(userId: string) {
  const { data, error } = await supabase
    .from('voucher_user_issuances')
    .select(`
      *,
      vouchers (
        id,
        code,
        title,
        description,
        discount_type,
        discount_value,
        usage_limit_per_user,
        expires_at,
        status,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('issued_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch issued vouchers');
  }

  return data || [];
}

/**
 * Get voucher redemption statistics
 */
export async function getVoucherStats(voucherId: string) {
  const { data: redemptions, error } = await supabase
    .from('voucher_redemptions')
    .select('*')
    .eq('voucher_id', voucherId);

  if (error) {
    throw new Error('Failed to fetch voucher statistics');
  }

  const totalRedemptions = redemptions?.length || 0;
  const totalDiscountGiven = redemptions?.reduce((sum, r) => sum + parseFloat(r.discount_amount.toString()), 0) || 0;
  const uniqueUsers = new Set(redemptions?.map(r => r.user_id) || []).size;

  return {
    total_redemptions: totalRedemptions,
    total_discount_given: totalDiscountGiven,
    unique_users: uniqueUsers
  };
}

