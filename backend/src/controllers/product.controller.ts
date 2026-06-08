import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createTransaction } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { calculateDiscountedPrice } from '../utils/price.utils';

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
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    console.log('📝 Purchase request:', { userId, productId, quantity });

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check stock availability
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Calculate total amount (products purchased directly via this endpoint always pay with coins)
    // Applying the 10% coin discount: basePrice * quantity * 0.9
    const discountedPrice = Math.round(product.price * 0.9);
    const totalAmount = discountedPrice * quantity;

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

    // Create transaction
    await createTransaction({
      userId,
      type: 'spend',
      amount: totalAmount,
      description: `Purchased ${quantity}x ${product.name}`,
      referenceId: order.id,
      referenceType: 'order'
    });

    // Send notification
    try {
      const { sendNotification } = await import('../services/notification.service');
      const notificationMessage = `Your order for ${quantity}x ${product.name} has been completed successfully!`;
      
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
        },
      });
    } catch (notifError) {
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
      }
    });
  } catch (error) {
    console.error('Purchase product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

