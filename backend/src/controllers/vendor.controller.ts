import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { validateDiscountPercentage, calculateDiscountedPrice } from '../utils/price.utils';

/**
 * Get all products created by vendor
 */
export async function getMyProducts(req: AuthRequest, res: Response) {
  try {
    const vendorId = req.user!.userId;

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('created_by', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get vendor products error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Calculate discounted prices for products
    const productsWithDiscounts = (products || []).map((product) => {
      const discountedPrice = calculateDiscountedPrice(
        product.price,
        product.discount_percentage
      );

      return {
        ...product,
        discountedPrice,
        hasDiscount: product.discount_percentage !== null && product.discount_percentage !== undefined && product.discount_percentage > 0,
      };
    });

    res.json({ products: productsWithDiscounts });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

import { getVendorLimits, ensureVendorProfile } from '../services/vendor.service';

/**
 * Create a new product (vendor only)
 */
export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const { name, description, price, imageUrl, category, stockQuantity } = req.body;
    const vendorId = req.user!.userId;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    // 1. Ensure profile exists
    await ensureVendorProfile(vendorId);

    // 2. Check limits
    const limits = await getVendorLimits(vendorId);
    
    if (!limits.canPostProduct) {
      return res.status(403).json({ 
        error: 'Product limit reached for this week', 
        details: `You have already posted ${limits.currentProducts} products this week. Upgrade to VIP for unlimited posts.` 
      });
    }

    if (category && !(await limits.canUseCategory(category))) {
      return res.status(403).json({ 
        error: 'Category limit reached', 
        details: `You are limited to ${limits.categoryLimit} category. Upgrade to VIP to sell in more categories.` 
      });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        description: description || null,
        price,
        image_url: imageUrl || null,
        category: category || null,
        stock_quantity: stockQuantity || 0,
        created_by: vendorId,
        is_active: true,
        status: 'pending_review' // New products must be reviewed
      })
      .select()
      .single();

    if (error) {
      console.error('Create product error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    // Calculate discounted price
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      product.discount_percentage
    );

    res.status(201).json({
      message: 'Product submitted for review successfully',
      product: {
        ...product,
        discountedPrice,
        hasDiscount: product.discount_percentage !== null && product.discount_percentage !== undefined && product.discount_percentage > 0,
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update a product (vendor can only update their own products)
 */
export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, price, imageUrl, category, stockQuantity, isActive } = req.body;
    const vendorId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    // Check if product exists and belongs to vendor (unless admin)
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Vendor can only update their own products
    if (!isAdmin && existingProduct.created_by !== vendorId) {
      return res.status(403).json({ error: 'You can only update your own products' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({ error: 'Price cannot be negative' });
      }
      updateData.price = price;
    }
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (category !== undefined) updateData.category = category;
    if (stockQuantity !== undefined) updateData.stock_quantity = stockQuantity;
    // Handle discount percentage
    if (req.body.discountPercentage !== undefined) {
      const validation = validateDiscountPercentage(req.body.discountPercentage);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
      // Set to null if empty string or 0, otherwise set the value
      updateData.discount_percentage = req.body.discountPercentage === '' || req.body.discountPercentage === 0 
        ? null 
        : req.body.discountPercentage;
    }
    // Only admin can change is_active status
    if (isActive !== undefined && isAdmin) {
      updateData.is_active = isActive;
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update product error:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    // Calculate discounted price
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      product.discount_percentage
    );

    res.json({
      message: 'Product updated successfully',
      product: {
        ...product,
        discountedPrice,
        hasDiscount: product.discount_percentage !== null && product.discount_percentage !== undefined && product.discount_percentage > 0,
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a product (soft delete - vendor can only delete their own products)
 */
export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const vendorId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    // Check if product exists and belongs to vendor (unless admin)
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Vendor can only delete their own products
    if (!isAdmin && existingProduct.created_by !== vendorId) {
      return res.status(403).json({ error: 'You can only delete your own products' });
    }

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Set discount percentage for a product (vendor can only set discount on their own products)
 */
export async function setProductDiscount(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { discountPercentage } = req.body;
    const vendorId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    // Validate discount percentage
    const validation = validateDiscountPercentage(discountPercentage);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if product exists and belongs to vendor (unless admin)
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Vendor can only set discount on their own products
    if (!isAdmin && existingProduct.created_by !== vendorId) {
      return res.status(403).json({ error: 'You can only set discount on your own products' });
    }

    // Set discount percentage (null if 0 or empty, otherwise set the value)
    const discountValue = discountPercentage === '' || discountPercentage === 0 || discountPercentage === null
      ? null
      : discountPercentage;

    const { data: product, error } = await supabase
      .from('products')
      .update({ discount_percentage: discountValue })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Set discount error:', error);
      return res.status(500).json({ error: 'Failed to set discount' });
    }

    // Calculate discounted price
    const discountedPrice = calculateDiscountedPrice(
      product.price,
      product.discount_percentage
    );

    res.json({
      message: discountValue ? 'Discount set successfully' : 'Discount removed successfully',
      product: {
        ...product,
        discountedPrice,
        hasDiscount: product.discount_percentage !== null && product.discount_percentage !== undefined && product.discount_percentage > 0,
      }
    });
  } catch (error) {
    console.error('Set discount error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get analytics for the current vendor (vendor dashboard)
 */
export async function getVendorAnalytics(req: AuthRequest, res: Response) {
  try {
    const vendorId = req.user!.userId;
    const { period = '30' } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(period as string));

    // Products this week
    const limits = await getVendorLimits(vendorId);

    // Total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', vendorId)
      .eq('is_active', true);

    // Orders this period
    const { data: orders } = await supabase
      .from('orders')
      .select('status, price_coins, price_vnd, payment_method, original_price_coins, created_at')
      .eq('vendor_id', vendorId)
      .gte('created_at', since.toISOString());

    const allOrders = orders || [];
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
    const totalRevenueCoins = deliveredOrders
      .reduce((sum, o) => sum + (o.price_coins || 0), 0); // total coins offset applied by buyers
    const totalRevenueVnd = deliveredOrders
      .reduce((sum, o) => sum + (o.original_price_coins || 0), 0); // gross sales value in VND

    // Active subscription
    const { data: subscription } = await supabase
      .from('vendor_subscriptions')
      .select('*, vendor_packages(name, product_limit)')
      .eq('vendor_id', vendorId)
      .eq('status', 'active')
      .single();

    res.json({
      analytics: {
        totalProducts: totalProducts || 0,
        productsThisWeek: limits.currentProducts,
        productLimit: limits.productLimit,
        canPostProduct: limits.canPostProduct,
        totalOrders: allOrders.length,
        deliveredOrders: deliveredOrders.length,
        pendingOrders: allOrders.filter(o => ['processing', 'shipped', 'out_for_delivery'].includes(o.status)).length,
        totalRevenueCoins,
        totalRevenueVnd,
        byStatus: allOrders.reduce((acc: Record<string, number>, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {}),
      },
      subscription: subscription ? {
        packageName: subscription.vendor_packages?.name || 'Unknown',
        productLimit: subscription.vendor_packages?.product_limit,
        expiresAt: subscription.expires_at,
        status: subscription.status,
      } : { packageName: 'Free', productLimit: 1, status: 'free' },
      period: parseInt(period as string),
    });
  } catch (error) {
    console.error('Get vendor analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Admin: Get analytics for ALL vendors
 */
export async function getAdminVendorStats(req: AuthRequest, res: Response) {
  try {
    // Get all vendors
    const { data: vendors } = await supabase
      .from('users')
      .select('id, full_name, email, created_at')
      .eq('role', 'vendor');

    if (!vendors) return res.json({ vendors: [] });

    // For each vendor, get stats
    const vendorStats = await Promise.all(
      vendors.map(async (vendor) => {
        const { count: totalProducts } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', vendor.id)
          .eq('is_active', true);

        const { data: orders } = await supabase
          .from('orders')
          .select('status, price_coins, price_vnd, payment_method, original_price_coins')
          .eq('vendor_id', vendor.id);

        const allOrders = orders || [];
        const delivered = allOrders.filter(o => o.status === 'delivered');
        const revenueCoins = delivered.reduce((s, o) => s + (o.price_coins || 0), 0);
        const revenueVnd = delivered.reduce((s, o) => s + (o.original_price_coins || 0), 0);

        const { data: subscription } = await supabase
          .from('vendor_subscriptions')
          .select('vendor_packages(name)')
          .eq('vendor_id', vendor.id)
          .eq('status', 'active')
          .single();

        return {
          ...vendor,
          totalProducts: totalProducts || 0,
          totalOrders: allOrders.length,
          deliveredOrders: delivered.length,
          revenueCoins,
          revenueVnd,
          subscriptionPlan: (subscription as any)?.vendor_packages?.name || 'Free',
        };
      })
    );

    res.json({ vendors: vendorStats });
  } catch (error) {
    console.error('Get admin vendor stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
