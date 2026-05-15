import { Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get products pending review
 */
export async function getPendingProducts(req: AuthRequest, res: Response) {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, users!products_created_by_fkey(full_name, email)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get pending products error:', error);
      return res.status(500).json({ error: 'Failed to fetch pending products' });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get pending products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Review a product (Approve/Reject)
 */
export async function reviewProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user!.userId;

    if (!['approved', 'rejected', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // 1. Update product status
    const { data: product, error: updateError } = await supabase
      .from('products')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !product) {
      console.error('Update product status error:', updateError);
      return res.status(500).json({ error: 'Failed to update product status' });
    }

    // 2. Create review record
    await supabase.from('product_reviews').insert({
      product_id: id,
      admin_id: adminId,
      status,
      reason: reason || null
    });

    // 3. Log moderation action
    await supabase.from('moderation_logs').insert({
      admin_id: adminId,
      action: status === 'approved' ? 'approve_product' : 'reject_product',
      target_id: id,
      target_type: 'product',
      details: { reason, product_name: product.name }
    });

    // 4. Send notification to vendor
    try {
      const { sendNotification } = await import('../services/notification.service');
      await sendNotification(product.created_by, {
        title: status === 'approved' ? 'Product Approved' : 'Product Rejected',
        message: status === 'approved' 
          ? `Your product "${product.name}" has been approved and is now live!` 
          : `Your product "${product.name}" was rejected. Reason: ${reason || 'No reason provided'}`,
        type: 'product_review',
        priority: 'high',
        data: { productId: id, status }
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
    }

    res.json({ message: `Product ${status} successfully`, product });
  } catch (error) {
    console.error('Review product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
