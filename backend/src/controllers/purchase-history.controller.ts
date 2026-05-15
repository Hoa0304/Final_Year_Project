import { Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get user's purchase history
 */
export async function getPurchaseHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Use purchase_history view
    const { data: purchases, error } = await supabase
      .from('purchase_history')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      console.error('Get purchase history error:', error);
      return res.status(500).json({ error: 'Failed to fetch purchase history' });
    }

    // Transform data from view
    const history = purchases?.map((p: any) => ({
      orderId: p.order_id,
      productId: p.product_id,
      productName: p.product_name,
      productImage: p.product_image,
      productCategory: p.product_category,
      productPriceAtPurchase: p.product_price_at_purchase,
      quantity: p.quantity,
      totalAmount: p.total_amount,
      transactionId: p.transaction_id,
      transactionDescription: p.transaction_description,
      transactionLabel: p.transaction_label,
      purchasedAt: p.purchased_at
    })) || [];

    res.json({ purchases: history });
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all purchase history (for ML training - admin only)
 */
export async function getAllPurchaseHistory(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    
    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.userId)
      .single();

    if (userError || userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all purchases from orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        total_amount,
        created_at,
        products (
          id,
          name,
          price,
          category
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get all purchase history error:', error);
      return res.status(500).json({ error: 'Failed to fetch purchase history' });
    }

    const purchases = orders?.map((order: any) => ({
      user_id: order.user_id,
      product_id: order.product_id,
      quantity: order.quantity,
      total_amount: parseFloat(order.total_amount.toString()),
      created_at: order.created_at,
    })) || [];

    res.json({ purchases });
  } catch (error) {
    console.error('Get all purchase history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

