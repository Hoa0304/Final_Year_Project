import api from '../config/api';

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'coin_bonus';
  discount_value: number;
  usage_limit_per_user?: number;
  total_usage_limit?: number;
  current_usage_count: number;
  valid_from: string;
  expires_at: string;
  status: 'active' | 'inactive' | 'expired';
  is_active: boolean;
  is_claimable: boolean;
  is_featured: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVoucherParams {
  code: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'coin_bonus';
  discount_value: number;
  usage_limit_per_user?: number;
  total_usage_limit?: number;
  valid_from?: string;
  expires_at: string;
  is_claimable?: boolean;
}

/**
 * Get all vouchers
 */
export async function getVouchers(filters?: {
  status?: string;
  is_active?: boolean;
  created_by?: string;
  limit?: number;
  offset?: number;
}): Promise<Voucher[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
  if (filters?.created_by) params.append('created_by', filters.created_by);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));

  const response = await api.get(`/vouchers?${params.toString()}`);
  return response.data.vouchers || [];
}

/**
 * Get available vouchers (claimable)
 */
export async function getAvailableVouchers(vendorId?: string): Promise<Voucher[]> {
  const params = new URLSearchParams();
  if (vendorId) params.append('vendor_id', vendorId);

  const response = await api.get(`/vouchers/available?${params.toString()}`);
  return response.data.vouchers || [];
}

/**
 * Get featured vouchers
 */
export async function getFeaturedVouchers(limit?: number, offset?: number): Promise<Voucher[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));

  const response = await api.get(`/vouchers/featured?${params.toString()}`);
  return response.data.vouchers || [];
}

/**
 * Get voucher by ID
 */
export async function getVoucherById(id: string): Promise<Voucher> {
  const response = await api.get(`/vouchers/${id}`);
  return response.data.voucher;
}

/**
 * Get voucher by code
 */
export async function getVoucherByCode(code: string): Promise<Voucher> {
  const response = await api.get(`/vouchers/code/${code}`);
  return response.data.voucher;
}

/**
 * Create voucher (Admin/Vendor)
 */
export async function createVoucher(params: CreateVoucherParams): Promise<Voucher> {
  const response = await api.post('/vouchers', params);
  return response.data.voucher;
}

/**
 * Update voucher (Admin/Vendor)
 */
export async function updateVoucher(id: string, updates: Partial<CreateVoucherParams & { is_featured?: boolean }>): Promise<Voucher> {
  const response = await api.put(`/vouchers/${id}`, updates);
  return response.data.voucher;
}

/**
 * Delete voucher (Admin/Vendor)
 */
export async function deleteVoucher(id: string): Promise<void> {
  await api.delete(`/vouchers/${id}`);
}

/**
 * Issue voucher to user (Admin/Vendor)
 */
export async function issueVoucherToUser(voucherId: string, userId: string, expiresAt?: string): Promise<void> {
  await api.post('/vouchers/issue', {
    voucher_id: voucherId,
    user_id: userId,
    expires_at: expiresAt
  });
}

/**
 * Claim voucher (User)
 */
export async function claimVoucher(voucherId: string): Promise<void> {
  await api.post('/vouchers/claim', {
    voucher_id: voucherId
  });
}

/**
 * Redeem voucher
 */
export async function redeemVoucher(voucherId: string, originalAmount: number, referenceId?: string, referenceType?: string): Promise<{
  discount_amount: number;
  final_amount: number;
  redemption_id?: string;
}> {
  const response = await api.post('/vouchers/redeem', {
    voucher_id: voucherId,
    original_amount: originalAmount,
    reference_id: referenceId,
    reference_type: referenceType
  });
  return response.data;
}

/**
 * Get user's voucher redemptions
 */
export async function getUserVoucherRedemptions(limit?: number, offset?: number): Promise<any[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));

  const response = await api.get(`/vouchers/my/redemptions?${params.toString()}`);
  return response.data.redemptions || [];
}

/**
 * Get user's issued vouchers
 */
export async function getUserIssuedVouchers(): Promise<any[]> {
  const response = await api.get('/vouchers/my/issued');
  return response.data.vouchers || [];
}

/**
 * Get vendor vouchers (public)
 */
export async function getVendorVouchers(vendorId: string, limit?: number, offset?: number): Promise<Voucher[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));

  const response = await api.get(`/vendors/${vendorId}/vouchers?${params.toString()}`);
  return response.data.vouchers || [];
}

















