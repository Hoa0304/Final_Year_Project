import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { calculateDiscountedPrice } from '../utils/price.utils';

/**
 * Get vendor information and products (public)
 * Used for vendor page/shop
 */
export async function getVendorInfo(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Get vendor info
    const { data: vendor, error: vendorError } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('id', id)
      .eq('role', 'vendor')
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get vendor's active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('created_by', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Get vendor products error:', productsError);
      return res.status(500).json({ error: 'Failed to fetch vendor products' });
    }

    // Calculate discounted prices
    const productsWithDiscounts = (products || []).map((product) => {
      const discountedPrice = calculateDiscountedPrice(
        product.price,
        product.discount_percentage
      );

      return {
        ...product,
        discountedPrice,
        hasDiscount: product.discount_percentage !== null && 
                     product.discount_percentage !== undefined && 
                     product.discount_percentage > 0,
      };
    });

    res.json({
      vendor: {
        id: vendor.id,
        email: vendor.email,
        full_name: vendor.full_name,
        created_at: vendor.created_at
      },
      products: productsWithDiscounts,
      productCount: productsWithDiscounts.length
    });
  } catch (error) {
    console.error('Get vendor info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * Get vendors by IDs (public)
 * Used to fetch vendor information for specific vendor IDs
 */
export async function getVendorsByIds(req: Request, res: Response) {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.status(400).json({ error: 'ids parameter is required' });
    }

    // Parse ids - can be comma-separated string or array
    let vendorIds: string[] = [];
    if (typeof ids === 'string') {
      vendorIds = ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
    } else if (Array.isArray(ids)) {
      vendorIds = ids.map(id => String(id).trim()).filter(id => id.length > 0);
    }

    if (vendorIds.length === 0) {
      return res.json({ vendors: [] });
    }

    // Fetch vendors by IDs
    const { data: vendors, error } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('role', 'vendor')
      .in('id', vendorIds);

    if (error) {
      console.error('Get vendors by IDs error:', error);
      return res.status(500).json({ error: 'Failed to fetch vendors' });
    }

    res.json({ vendors: vendors || [] });
  } catch (error) {
    console.error('Get vendors by IDs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Search vendors (public)
 * Used for finding vendors
 */
export async function searchVendors(req: Request, res: Response) {
  try {
    const { search, limit, offset } = req.query;

    let query = supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('role', 'vendor')
      .order('created_at', { ascending: false });

    // Filter by search (name or email)
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination
    if (limit) {
      const offsetValue = offset ? parseInt(offset as string) : 0;
      const limitValue = parseInt(limit as string);
      query = query.range(offsetValue, offsetValue + limitValue - 1);
    }

    const { data: vendors, error } = await query;

    if (error) {
      console.error('Search vendors error:', error);
      return res.status(500).json({ error: 'Failed to search vendors' });
    }

    // Get product count for each vendor
    const vendorsWithCounts = await Promise.all(
      (vendors || []).map(async (vendor) => {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', vendor.id)
          .eq('is_active', true);

        return {
          ...vendor,
          productCount: count || 0
        };
      })
    );

    res.json({ vendors: vendorsWithCounts });
  } catch (error) {
    console.error('Search vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

