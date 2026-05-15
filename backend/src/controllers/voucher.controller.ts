import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createVoucher,
  getVoucherById,
  getVoucherByCode,
  getVouchers,
  updateVoucher,
  deleteVoucher,
  issueVoucherToUser,
  claimVoucher,
  getAvailableVouchers,
  getFeaturedVouchers,
  redeemVoucher,
  getUserVoucherRedemptions,
  getUserIssuedVouchers,
  getVoucherStats,
  CreateVoucherParams,
  RedeemVoucherParams
} from '../services/voucher.service';
import { createTransaction } from '../services/transaction.service';

/**
 * Create a new voucher
 * Admin and Vendors can create vouchers
 */
export async function createVoucherHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';
    const isVendor = req.user!.role === 'vendor';

    if (!isAdmin && !isVendor) {
      return res.status(403).json({ error: 'Only Admin and Vendors can create vouchers' });
    }

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
      is_claimable
    } = req.body;

    // Validate required fields
    if (!code || !title || !discount_type || discount_value === undefined || !expires_at) {
      return res.status(400).json({
        error: 'Missing required fields: code, title, discount_type, discount_value, expires_at'
      });
    }

    // Validate discount type
    if (!['percentage', 'fixed_amount', 'coin_bonus'].includes(discount_type)) {
      return res.status(400).json({
        error: 'Invalid discount_type. Must be: percentage, fixed_amount, or coin_bonus'
      });
    }

    const voucher = await createVoucher({
      code,
      title,
      description,
      discount_type,
      discount_value: parseFloat(discount_value),
      usage_limit_per_user: usage_limit_per_user ? parseInt(usage_limit_per_user) : undefined,
      total_usage_limit: total_usage_limit ? parseInt(total_usage_limit) : undefined,
      valid_from,
      expires_at,
      is_claimable: is_claimable !== undefined ? Boolean(is_claimable) : false,
      is_featured: false, // Only admin can set this via update
      created_by: userId
    });

    res.status(201).json({
      message: 'Voucher created successfully',
      voucher
    });
  } catch (error: any) {
    console.error('Create voucher error:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('must be') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all vouchers
 * Admin and Vendors can see all vouchers
 * Regular users can only see active vouchers
 */
export async function getVouchersHandler(req: Request, res: Response) {
  try {
    const { status, is_active, created_by, limit, offset } = req.query;
    const authReq = req as AuthRequest;
    const isAdmin = authReq.user?.role === 'admin';
    const isVendor = authReq.user?.role === 'vendor';

    // Regular users can only see active vouchers
    const filters: any = {};
    if (!isAdmin && !isVendor) {
      filters.status = 'active';
      filters.is_active = true;
    } else {
      if (status) filters.status = status;
      if (is_active !== undefined) filters.is_active = is_active === 'true';
      if (created_by) filters.created_by = created_by;
    }

    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);

    const vouchers = await getVouchers(filters);

    res.json({ vouchers });
  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get voucher by ID
 */
export async function getVoucherByIdHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const voucher = await getVoucherById(id);

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.json({ voucher });
  } catch (error) {
    console.error('Get voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get voucher by code
 */
export async function getVoucherByCodeHandler(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const voucher = await getVoucherByCode(code);

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.json({ voucher });
  } catch (error) {
    console.error('Get voucher by code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update voucher
 * Only the creator (or admin) can update
 */
export async function updateVoucherHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';
    const isVendor = req.user!.role === 'vendor';

    if (!isAdmin && !isVendor) {
      return res.status(403).json({ error: 'Only Admin and Vendors can update vouchers' });
    }

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
      is_featured
    } = req.body;

    const updates: Partial<CreateVoucherParams> = {};
    if (code) updates.code = code;
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (discount_type) updates.discount_type = discount_type;
    if (discount_value !== undefined) updates.discount_value = parseFloat(discount_value);
    if (usage_limit_per_user !== undefined) updates.usage_limit_per_user = parseInt(usage_limit_per_user);
    if (total_usage_limit !== undefined) updates.total_usage_limit = parseInt(total_usage_limit);
    if (valid_from) updates.valid_from = valid_from;
    if (expires_at) updates.expires_at = expires_at;
    if (is_claimable !== undefined) updates.is_claimable = is_claimable;
    // Only admin can set is_featured
    if (is_featured !== undefined && isAdmin) {
      updates.is_featured = Boolean(is_featured);
    }

    const voucher = await updateVoucher(id, updates, userId, isAdmin);

    res.json({
      message: 'Voucher updated successfully',
      voucher
    });
  } catch (error: any) {
    console.error('Update voucher error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('can only update')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('must be') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete voucher (soft delete)
 * Only the creator (or admin) can delete
 */
export async function deleteVoucherHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';
    const isVendor = req.user!.role === 'vendor';

    if (!isAdmin && !isVendor) {
      return res.status(403).json({ error: 'Only Admin and Vendors can delete vouchers' });
    }

    await deleteVoucher(id, userId, isAdmin);

    res.json({ message: 'Voucher deleted successfully' });
  } catch (error: any) {
    console.error('Delete voucher error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('can only delete')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get available vouchers that users can claim
 * Can filter by vendor_id to show vouchers from specific vendor
 */
export async function getAvailableVouchersHandler(req: Request, res: Response) {
  try {
    const { vendor_id, limit, offset } = req.query;

    const vouchers = await getAvailableVouchers({
      vendor_id: vendor_id as string | undefined,
      is_claimable: true,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({ vouchers });
  } catch (error) {
    console.error('Get available vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Claim a voucher (user self-service)
 * Users can claim claimable vouchers themselves
 */
export async function claimVoucherHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { voucher_id } = req.body;

    if (!voucher_id) {
      return res.status(400).json({ error: 'voucher_id is required' });
    }

    await claimVoucher(voucher_id, userId);

    res.json({ message: 'Voucher claimed successfully' });
  } catch (error: any) {
    console.error('Claim voucher error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('cannot be claimed') || 
        error.message.includes('not active') ||
        error.message.includes('expired') ||
        error.message.includes('not yet valid') ||
        error.message.includes('limit has been reached')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Issue voucher to a specific user (Admin or Vendor)
 */
export async function issueVoucherToUserHandler(req: AuthRequest, res: Response) {
  try {
    const isAdmin = req.user!.role === 'admin';
    const isVendor = req.user!.role === 'vendor';
    
    if (!isAdmin && !isVendor) {
      return res.status(403).json({ error: 'Only Admin and Vendors can issue vouchers to users' });
    }

    const { voucher_id, user_id, expires_at } = req.body;

    if (!voucher_id || !user_id) {
      return res.status(400).json({ error: 'voucher_id and user_id are required' });
    }

    await issueVoucherToUser({
      voucher_id,
      user_id,
      issued_by: req.user!.userId,
      expires_at
    });

    res.json({ message: 'Voucher issued to user successfully' });
  } catch (error: any) {
    console.error('Issue voucher error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('not active')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Redeem a voucher
 * Users can redeem vouchers during checkout, coin top-up, etc.
 */
export async function redeemVoucherHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { voucher_id, original_amount, reference_id, reference_type } = req.body;

    if (!voucher_id || original_amount === undefined) {
      return res.status(400).json({
        error: 'voucher_id and original_amount are required'
      });
    }

    if (original_amount <= 0) {
      return res.status(400).json({ error: 'original_amount must be greater than 0' });
    }

    const result = await redeemVoucher({
      voucher_id,
      user_id: userId,
      original_amount: parseFloat(original_amount),
      reference_id,
      reference_type
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to redeem voucher',
        discount_amount: result.discount_amount,
        final_amount: result.final_amount
      });
    }

    // If it's a coin_bonus type, add coins to user balance
    const voucher = await getVoucherById(voucher_id);
    if (voucher && voucher.discount_type === 'coin_bonus') {
      await createTransaction({
        userId,
        type: 'grant',
        amount: result.discount_amount,
        description: `Coin bonus from voucher: ${voucher.code}`,
        referenceId: result.redemption_id,
        referenceType: 'voucher_redemption'
      });
    }

    res.json({
      message: 'Voucher redeemed successfully',
      discount_amount: result.discount_amount,
      final_amount: result.final_amount,
      redemption_id: result.redemption_id
    });
  } catch (error: any) {
    console.error('Redeem voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's voucher redemptions
 */
export async function getUserVoucherRedemptionsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const redemptions = await getUserVoucherRedemptions(userId, limit, offset);

    res.json({ redemptions });
  } catch (error) {
    console.error('Get user redemptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get vouchers issued to the current user
 */
export async function getMyIssuedVouchersHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const vouchers = await getUserIssuedVouchers(userId);

    res.json({ vouchers });
  } catch (error) {
    console.error('Get issued vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get featured vouchers for public voucher page
 * Only shows vouchers marked as featured by admin
 * Automatically hides vouchers that are out of stock
 */
export async function getFeaturedVouchersHandler(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const vouchers = await getFeaturedVouchers(limit, offset);

    res.json({ vouchers });
  } catch (error) {
    console.error('Get featured vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get voucher statistics (Admin only)
 */
export async function getVoucherStatsHandler(req: AuthRequest, res: Response) {
  try {
    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only Admin can view voucher statistics' });
    }

    const { id } = req.params;
    const stats = await getVoucherStats(id);

    res.json({ stats });
  } catch (error) {
    console.error('Get voucher stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

