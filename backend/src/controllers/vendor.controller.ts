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
    const { name, description, price, imageUrl, category, stockQuantity, randomVoucherIds } = req.body;
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

    // Validate random_voucher_ids if provided
    if (randomVoucherIds && !Array.isArray(randomVoucherIds)) {
      return res.status(400).json({ error: 'randomVoucherIds must be an array' });
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
        random_voucher_ids: randomVoucherIds && randomVoucherIds.length > 0 ? randomVoucherIds : null,
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
    const { name, description, price, imageUrl, category, stockQuantity, isActive, randomVoucherIds } = req.body;
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
    // Handle random voucher IDs
    if (req.body.randomVoucherIds !== undefined) {
      if (!Array.isArray(req.body.randomVoucherIds)) {
        return res.status(400).json({ error: 'randomVoucherIds must be an array' });
      }
      updateData.random_voucher_ids = req.body.randomVoucherIds && req.body.randomVoucherIds.length > 0 
        ? req.body.randomVoucherIds 
        : null;
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

