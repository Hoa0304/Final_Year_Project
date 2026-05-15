import { Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { calculateDiscountedPrice } from '../utils/price.utils';

/**
 * Get user's shopping cart
 */
export async function getCart(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { data: cartItems, error } = await supabase
      .from('shopping_cart')
      .select(`
        id,
        product_id,
        quantity,
        created_at,
        updated_at,
        products (
          id,
          name,
          description,
          price,
          image_url,
          category,
          stock_quantity,
          is_active,
          discount_percentage,
          created_by
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get cart error:', error);
      return res.status(500).json({ error: 'Failed to fetch cart' });
    }

    // Transform data and calculate discounted prices
    const cart = (cartItems || []).map((item: any) => {
      const product = item.products;
      const originalPrice = product ? parseFloat(product.price.toString()) : 0;
      const discountedPrice = calculateDiscountedPrice(
        originalPrice,
        product?.discount_percentage
      );
      
      return {
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        product: {
          id: product?.id,
          name: product?.name,
          description: product?.description,
          price: originalPrice,
          imageUrl: product?.image_url,
          category: product?.category,
          stockQuantity: product?.stock_quantity,
          isActive: product?.is_active,
          discountPercentage: product?.discount_percentage || null,
          discountedPrice: discountedPrice,
          hasDiscount: product?.discount_percentage !== null && product?.discount_percentage > 0,
          created_by: product?.created_by
        },
        subtotal: discountedPrice * item.quantity,
        addedAt: item.created_at
      };
    });

    // Calculate total
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

    res.json({
      items: cart,
      total,
      itemCount: cart.length
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add item to cart
 */
export async function addToCart(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Check if product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check stock
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    const { data: existingItem } = await supabase
      .from('shopping_cart')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    let cartItem;
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock_quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      const { data: updated, error: updateError } = await supabase
        .from('shopping_cart')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update cart error:', updateError);
        return res.status(500).json({ error: 'Failed to update cart' });
      }

      cartItem = updated;
    } else {
      // Add new item
      const { data: inserted, error: insertError } = await supabase
        .from('shopping_cart')
        .insert({
          user_id: userId,
          product_id: productId,
          quantity
        })
        .select()
        .single();

      if (insertError) {
        console.error('Add to cart error:', insertError);
        return res.status(500).json({ error: 'Failed to add to cart' });
      }

      cartItem = inserted;
    }

    res.json({
      message: 'Item added to cart',
      cartItem
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Get cart item
    const { data: cartItem, error: fetchError } = await supabase
      .from('shopping_cart')
      .select(`
        *,
        products (
          stock_quantity
        )
      `)
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    const stockQuantity = (cartItem as any).products?.stock_quantity || 0;
    if (stockQuantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Update quantity
    const { data: updated, error: updateError } = await supabase
      .from('shopping_cart')
      .update({
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('Update cart item error:', updateError);
      return res.status(500).json({ error: 'Failed to update cart item' });
    }

    res.json({
      message: 'Cart item updated',
      cartItem: updated
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { itemId } = req.params;

    // Verify ownership
    const { data: cartItem } = await supabase
      .from('shopping_cart')
      .select('id')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Delete item
    const { error: deleteError } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('Remove from cart error:', deleteError);
      return res.status(500).json({ error: 'Failed to remove from cart' });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Clear cart error:', error);
      return res.status(500).json({ error: 'Failed to clear cart' });
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
