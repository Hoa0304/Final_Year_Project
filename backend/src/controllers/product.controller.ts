import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createTransaction } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { calculateDiscountedPrice } from '../utils/price.utils';
import { redeemVoucher, getVoucherByCode, getVoucherById, randomVoucherAfterPurchase } from '../services/voucher.service';

/**
 * Get all active products
 * Supports filtering by category, search, price range, stock status
 * Supports sorting by price, name, created_at
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const { 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      inStock, 
      sortBy = 'newest', // 'newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'
      limit,
      offset 
    } = req.query;

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'approved');

    // Filter by category
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by search (name or description)
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by price range
    if (minPrice) {
      const min = parseFloat(minPrice as string);
      if (!isNaN(min)) {
        query = query.gte('price', min);
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      if (!isNaN(max)) {
        query = query.lte('price', max);
      }
    }

    // Filter by stock status
    if (inStock === 'true') {
      query = query.gt('stock_quantity', 0);
    } else if (inStock === 'false') {
      query = query.eq('stock_quantity', 0);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'name_asc':
        query = query.order('name', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('name', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }
    if (offset) {
      const offsetNum = parseInt(offset as string, 10);
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        query = query.range(offsetNum, offsetNum + (limit ? parseInt(limit as string, 10) - 1 : 999));
      }
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Get products error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Calculate average rating for each product efficiently
    const productIds = (products || []).map((p) => p.id);
    
    // Get all ratings for these products in one query
    const { data: allRatings } = await supabase
      .from('product_ratings')
      .select('product_id, rating')
      .in('product_id', productIds);

    // Calculate ratings per product
    const ratingsMap = new Map<string, { total: number; count: number }>();
    allRatings?.forEach((rating) => {
      const existing = ratingsMap.get(rating.product_id) || { total: 0, count: 0 };
      ratingsMap.set(rating.product_id, {
        total: existing.total + rating.rating,
        count: existing.count + 1,
      });
    });

    // Add rating data and calculate discounted prices for products
    const productsWithRatings = (products || []).map((product) => {
      const ratingData = ratingsMap.get(product.id);
      const totalRatings = ratingData?.count || 0;
      const averageRating =
        totalRatings > 0 ? ratingData!.total / totalRatings : 0;

      // Calculate discounted price
      const discountedPrice = calculateDiscountedPrice(
        product.price,
        product.discount_percentage
      );

      return {
        ...product,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        discountedPrice,
        hasDiscount: product.discount_percentage !== null && product.discount_percentage > 0,
      };
    });

    res.json({ products: productsWithRatings });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all unique categories from active products
 */
export async function getCategories(req: Request, res: Response) {
  try {
    // Get all active products with categories
    const { data: products, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);

    if (error) {
      console.error('Get categories error:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    // Extract unique categories and sort them
    const categories = Array.from(
      new Set(products?.map((p) => p.category).filter(Boolean) || [])
    ).sort();

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get product by ID
 */
export async function getProductById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate discounted price
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      product.discount_percentage
    );

    res.json({
      product: {
        ...product,
        discountedPrice,
        hasDiscount: product.discount_percentage !== null && product.discount_percentage > 0,
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Purchase a product
 * Validates balance, creates order, deducts coins, creates transaction
 */
export async function purchaseProduct(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { productId, quantity = 1, voucher_id, voucher_code } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    console.log('📝 Purchase request:', { userId, productId, quantity, voucher_id, voucher_code });

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      console.error('❌ Product not found:', { productId, error: productError });
      // Check if product exists but is inactive
      const { data: inactiveProduct } = await supabase
        .from('products')
        .select('id, is_active')
        .eq('id', productId)
        .single();
      
      if (inactiveProduct) {
        console.log('   Product exists but is inactive');
      } else {
        console.log('   Product does not exist in database');
      }
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('✅ Product found:', { id: product.id, name: product.name, stock: product.stock_quantity });

    // Check stock availability
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Calculate total amount using discounted price if discount exists
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      product.discount_percentage
    );
    const originalAmount = discountedPrice * quantity;
    let totalAmount = originalAmount;
    let voucherToApply = null;
    let appliedVoucher = null;

    // Validate and prepare voucher if provided (but don't redeem yet - need order ID first)
    if (voucher_id || voucher_code) {
      try {
        // Get voucher by ID or code
        let voucher = null;
        if (voucher_id) {
          voucher = await getVoucherById(voucher_id);
        } else if (voucher_code) {
          voucher = await getVoucherByCode(voucher_code);
        }

        if (!voucher) {
          return res.status(404).json({ error: 'Voucher not found' });
        }

        // Validate voucher can be redeemed (but don't redeem yet)
        const { validateVoucherRedemption } = await import('../services/voucher.service');
        const validation = await validateVoucherRedemption(voucher.id, userId);
        
        if (!validation.can_redeem) {
          return res.status(400).json({
            error: validation.error || 'Cannot redeem voucher',
            voucher_error: true
          });
        }

        // Calculate discount amount to determine final price
        const { calculateVoucherDiscount } = await import('../services/voucher.service');
        const discountAmount = calculateVoucherDiscount(voucher, originalAmount);
        
        // Apply discount (for coin_bonus, we don't subtract from order amount)
        if (voucher.discount_type !== 'coin_bonus') {
          totalAmount = Math.max(0, originalAmount - discountAmount);
        }

        voucherToApply = {
          id: voucher.id,
          code: voucher.code,
          discount_amount: discountAmount,
          discount_type: voucher.discount_type
        };

        console.log('✅ Voucher validated and will be applied:', voucherToApply);
      } catch (voucherError: any) {
        console.error('Voucher validation error:', voucherError);
        return res.status(400).json({
          error: voucherError.message || 'Failed to validate voucher'
        });
      }
    }

    // Get user balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has sufficient balance
    if (user.virtual_balance < totalAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        product_id: productId,
        quantity,
        total_amount: totalAmount,
        status: 'completed'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Create order error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // Update product stock
    await supabase
      .from('products')
      .update({ stock_quantity: product.stock_quantity - quantity })
      .eq('id', productId);

    // Redeem voucher now that we have the order ID
    if (voucherToApply) {
      try {
        const redemptionResult = await redeemVoucher({
          voucher_id: voucherToApply.id,
          user_id: userId,
          original_amount: originalAmount,
          reference_id: order.id,
          reference_type: 'order'
        });

        if (redemptionResult.success) {
          appliedVoucher = {
            code: voucherToApply.code,
            discount_amount: voucherToApply.discount_amount,
            discount_type: voucherToApply.discount_type
          };
          console.log('✅ Voucher redeemed successfully:', appliedVoucher);
        } else {
          // This shouldn't happen since we validated earlier, but handle it
          console.error('Voucher redemption failed after validation:', redemptionResult.error);
        }
      } catch (redemptionError: any) {
        // Log error but don't fail the purchase (voucher was already validated)
        console.error('Voucher redemption error after order creation:', redemptionError);
      }
    }

    // Create transaction
    await createTransaction({
      userId,
      type: 'spend',
      amount: totalAmount,
      description: `Purchased ${quantity}x ${product.name}${appliedVoucher ? ` (Voucher: ${appliedVoucher.code})` : ''}`,
      referenceId: order.id,
      referenceType: 'order'
    });

    // Random voucher after purchase (if product has a vendor)
    let randomVoucher = null;
    if (product.created_by) {
      try {
        const { randomVoucherAfterPurchase } = await import('../services/voucher.service');
        randomVoucher = await randomVoucherAfterPurchase(product.created_by, userId, productId);
        if (randomVoucher) {
          console.log('🎁 Random voucher issued after purchase:', randomVoucher.code);
        }
      } catch (voucherError) {
        // Don't fail the purchase if random voucher fails
        console.error('Failed to issue random voucher:', voucherError);
      }
    }

    // Send notification
    try {
      const { sendNotification } = await import('../services/notification.service');
      let notificationMessage = `Your order for ${quantity}x ${product.name} has been completed successfully!`;
      
      if (randomVoucher) {
        notificationMessage += ` You received a voucher: ${randomVoucher.code}!`;
      }
      
      await sendNotification(userId, {
        title: 'Order Completed',
        message: notificationMessage,
        type: 'order_completed',
        priority: 'high',
        data: {
          orderId: order.id,
          productId: productId,
          productName: product.name,
          quantity,
          totalAmount,
          ...(randomVoucher && { randomVoucher: { id: randomVoucher.id, code: randomVoucher.code } })
        },
      });
    } catch (notifError) {
      // Don't fail the purchase if notification fails
      console.error('Failed to send notification:', notifError);
    }

    res.json({
      message: 'Product purchased successfully',
      order: {
        id: order.id,
        product: product.name,
        quantity,
        totalAmount,
        status: order.status,
        ...(appliedVoucher && {
          voucher: appliedVoucher,
          originalAmount: originalAmount,
          discountApplied: appliedVoucher.discount_amount
        }),
        ...(randomVoucher && {
          randomVoucher: {
            code: randomVoucher.code,
            title: randomVoucher.title,
            discount_type: randomVoucher.discount_type,
            discount_value: randomVoucher.discount_value
          }
        })
      }
    });
  } catch (error) {
    console.error('Purchase product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

