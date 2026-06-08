import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../utils/supabase';
import { createTransaction } from '../services/transaction.service';

/**
 * Create a new order
 * Called when client completes checkout (coin or VND payment)
 */
export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const { productId, quantity = 1, paymentMethod = 'vnd', addressText, notes, useCoins = false } = req.body;
    const userId = req.user!.userId;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    if (!['coin', 'vnd'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'paymentMethod must be "coin" or "vnd"' });
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, users!created_by(id, full_name, email)')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found or not available' });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Determine price in VND (direct conversion)
    const totalVnd = product.price * quantity;
    let coinsToDeduct = 0;

    // Check user balance for coin discount if enabled
    if (useCoins || paymentMethod === 'coin') {
      const { data: user } = await supabase
        .from('users')
        .select('virtual_balance')
        .eq('id', userId)
        .single();

      if (user && user.virtual_balance > 0) {
        coinsToDeduct = Math.min(user.virtual_balance, totalVnd);
      }
    }

    const finalPriceCoins = coinsToDeduct;
    const finalPriceVnd = totalVnd - coinsToDeduct;

    // Estimate delivery date: 3-5 business days from now
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4); // 4 days default

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        vendor_id: product.created_by,
        product_id: productId,
        quantity,
        payment_method: 'vnd', // Order is always VND in new system
        price_coins: finalPriceCoins, // Coins used to discount
        price_vnd: finalPriceVnd, // VND remaining to pay
        original_price_coins: totalVnd, // Original VND total price
        discount_applied: finalPriceCoins,
        status: finalPriceVnd === 0 ? 'processing' : 'pending_payment',
        estimated_delivery: estimatedDelivery.toISOString(),
        delivery_address: addressText || null,
        notes: notes || null,
        paid_at: finalPriceVnd === 0 ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Create order error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // Deduct coins if coins are used
    if (finalPriceCoins > 0) {
      await createTransaction({
        userId,
        type: 'spend',
        amount: finalPriceCoins,
        description: `Shopee Coin Offset: ${product.name} x${quantity}`,
        referenceId: order.id,
        referenceType: 'order',
      });
    }

    // If fully paid with coins, credit vendor immediately
    if (finalPriceVnd === 0) {
      await createTransaction({
        userId: product.created_by,
        type: 'earn',
        amount: Math.round(totalVnd * 0.9), // 90% goes to vendor (10% platform fee)
        description: `Sale (Fully offset with coins): ${product.name} x${quantity}`,
        referenceId: order.id,
        referenceType: 'order_income',
      });
    }

    // Reduce stock
    await supabase
      .from('products')
      .update({ stock_quantity: product.stock_quantity - quantity })
      .eq('id', productId);

    res.status(201).json({
      message: 'Order created successfully',
      order,
      paymentInfo: {
        amount: finalPriceVnd,
        currency: 'VND',
        coinsUsed: finalPriceCoins,
        status: finalPriceVnd === 0 ? 'paid' : 'pending_payment',
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get orders for current user (client view)
 */
export async function getMyOrders(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        products(id, name, image_url, price, category),
        vendor:vendor_id(id, full_name, email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((+page - 1) * +limit, +page * +limit - 1);

    if (status) query = query.eq('status', status as string);

    const { data: orders, error } = await query;
    if (error) throw error;

    // Check for late deliveries
    const now = new Date();
    const ordersWithLateFlag = (orders || []).map(order => ({
      ...order,
      isLate: order.estimated_delivery
        && !['delivered', 'cancelled'].includes(order.status)
        && new Date(order.estimated_delivery) < now,
    }));

    res.json({ orders: ordersWithLateFlag });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a single order detail
 */
export async function getOrderById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        products(id, name, image_url, price, category, description),
        client:user_id(id, full_name, email),
        vendor:vendor_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization: client can see their own, vendor can see theirs, admin sees all
    if (userRole !== 'admin' && order.user_id !== userId && order.vendor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();
    const isLate = order.estimated_delivery
      && !['delivered', 'cancelled'].includes(order.status)
      && new Date(order.estimated_delivery) < now;

    res.json({ order: { ...order, isLate } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get orders for vendor (vendor view)
 */
export async function getVendorOrders(req: AuthRequest, res: Response) {
  try {
    const vendorId = req.user!.userId;
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        products(id, name, image_url, price),
        client:user_id(id, full_name, email)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .range((+page - 1) * +limit, +page * +limit - 1);

    if (status) query = query.eq('status', status as string);

    const { data: orders, error } = await query;
    if (error) throw error;

    res.json({ orders: orders || [] });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update order status (vendor only)
 * Tracks delivery stages: processing → shipped → out_for_delivery → delivered
 */
export async function updateOrderStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, notes, trackingCode } = req.body;
    const vendorId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    const validTransitions: Record<string, string[]> = {
      pending_payment: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!isAdmin && order.vendor_id !== vendorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowedNext = validTransitions[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from "${order.status}" to "${status}"`,
        allowedTransitions: allowedNext,
      });
    }

    const updateData: any = { status };
    if (notes) updateData.vendor_notes = notes;
    if (trackingCode) updateData.tracking_code = trackingCode;
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString();
    if (status === 'shipped') updateData.shipped_at = new Date().toISOString();

    // Check if late delivery (for informational analytics only)
    const now = new Date();
    const isLate = order.estimated_delivery && new Date(order.estimated_delivery) < now && status === 'delivered';

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      message: 'Order status updated',
      order: updatedOrder,
      lateCompensation: null,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Admin: Get all orders with filters
 */
export async function getAllOrders(req: AuthRequest, res: Response) {
  try {
    const { status, vendor_id, user_id, page = 1, limit = 50 } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        products(id, name, price),
        client:user_id(id, full_name, email),
        vendor:vendor_id(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .range((+page - 1) * +limit, +page * +limit - 1);

    if (status) query = query.eq('status', status as string);
    if (vendor_id) query = query.eq('vendor_id', vendor_id as string);
    if (user_id) query = query.eq('user_id', user_id as string);

    const { data: orders, count, error } = await query;
    if (error) throw error;

    res.json({ orders: orders || [], total: count });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Admin/Vendor: Get order analytics
 */
export async function getOrderAnalytics(req: AuthRequest, res: Response) {
  try {
    const vendorId = req.user!.role === 'admin' ? (req.query.vendor_id as string) : req.user!.userId;
    const { period = '30' } = req.query; // days

    const since = new Date();
    since.setDate(since.getDate() - parseInt(period as string));

    let query = supabase
      .from('orders')
      .select('status, payment_method, price_coins, price_vnd, created_at, late_compensation_voucher_id, products(name)')
      .gte('created_at', since.toISOString());

    if (vendorId) query = query.eq('vendor_id', vendorId);

    const { data: orders, error } = await query;
    if (error) throw error;

    const allOrders = orders || [];

    const analytics = {
      totalOrders: allOrders.length,
      byStatus: allOrders.reduce((acc: Record<string, number>, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}),
      byPaymentMethod: allOrders.reduce((acc: Record<string, number>, o) => {
        acc[o.payment_method] = (acc[o.payment_method] || 0) + 1;
        return acc;
      }, {}),
      totalRevenueCoins: allOrders.filter(o => o.payment_method === 'coin').reduce((sum, o) => sum + (o.price_coins || 0), 0),
      totalRevenueVnd: allOrders.filter(o => o.payment_method === 'vnd').reduce((sum, o) => sum + (o.price_vnd || 0), 0),
      deliveredOrders: allOrders.filter(o => o.status === 'delivered').length,
      lateOrders: allOrders.filter(o => o.status === 'delivered' && o.late_compensation_voucher_id).length,
    };

    res.json({ analytics, period: parseInt(period as string) });
  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mock VND payment confirmation (dev only)
 * Simulates payment gateway callback
 */
export async function mockVndPayment(req: AuthRequest, res: Response) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Mock payment only available in development' });
    }

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('payment_method', 'vnd')
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found or not a VND order' });
    }

    if (order.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Order already processed' });
    }

    // Credit vendor via 90% of the original VND value (since coins offset is subsidized by platform)
    const vendorCoins = Math.round(order.original_price_coins * 0.9);

    await supabase.from('orders').update({
      status: 'processing',
      paid_at: new Date().toISOString(),
    }).eq('id', orderId);

    await createTransaction({
      userId: order.vendor_id,
      type: 'earn',
      amount: vendorCoins,
      description: `VND Sale (mock) - order ${orderId.slice(0, 8)}`,
      referenceId: orderId,
      referenceType: 'order_income_vnd',
    });

    res.json({
      message: '✅ Mock VND payment confirmed (dev mode)',
      order: { ...order, status: 'processing' },
      vendorCredited: vendorCoins,
    });
  } catch (error) {
    console.error('Mock VND payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
