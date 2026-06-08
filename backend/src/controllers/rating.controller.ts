import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get all ratings for a product
 * Returns ratings with user information and calculates average rating
 */
export async function getProductRatings(req: Request, res: Response) {
  try {
    const { productId } = req.params;

    // Verify product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, is_active')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.is_active) {
      return res.status(404).json({ error: 'Product is not available' });
    }

    // Get all ratings for this product with user information
    const { data: ratings, error: ratingsError } = await supabase
      .from('product_ratings')
      .select(`
        id,
        user_id,
        rating,
        review_text,
        created_at,
        updated_at
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      console.error('Get ratings error:', ratingsError);
      return res.status(500).json({ error: 'Failed to fetch ratings' });
    }

    // Fetch user information for each rating
    if (ratings && ratings.length > 0) {
      const userIds = [...new Set(ratings.map((r) => r.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);

      const usersMap = new Map(users?.map((u) => [u.id, u]) || []);

      // Combine ratings with user data
      const ratingsWithUsers = ratings.map((rating) => ({
        ...rating,
        users: usersMap.get(rating.user_id) || null,
      }));

      ratings.splice(0, ratings.length, ...ratingsWithUsers);
    }

    // Calculate average rating and total count
    const totalRatings = ratings?.length || 0;
    const averageRating =
      totalRatings > 0
        ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    // Get rating distribution (count of each star rating)
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    ratings?.forEach((r) => {
      ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
    });

    res.json({
      productId,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings,
      ratingDistribution,
      ratings: ratings || [],
    });
  } catch (error) {
    console.error('Get product ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit a rating for a product
 * Only users who have purchased the product can rate
 */
export async function submitRating(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;
    const { rating, reviewText } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, is_active')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.is_active) {
      return res.status(400).json({ error: 'Cannot rate inactive product' });
    }

    // Check if user has purchased this product
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'completed')
      .limit(1)
      .single();

    if (orderError || !order) {
      return res.status(403).json({
        error: 'You can only rate products you have purchased',
      });
    }

    // Check if user already rated this product
    const { data: existingRating, error: existingError } = await supabase
      .from('product_ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existingRating) {
      return res.status(400).json({
        error: 'You have already rated this product. Use update endpoint to modify your rating.',
      });
    }

    // Create rating
    const { data: newRating, error: createError } = await supabase
      .from('product_ratings')
      .insert({
        user_id: userId,
        product_id: productId,
        rating: parseInt(rating, 10),
        review_text: reviewText || null,
      })
      .select('*')
      .single();

    // Fetch user information
    if (newRating) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      (newRating as any).users = user || null;
    }

    if (createError) {
      console.error('Create rating error:', createError);
      return res.status(500).json({ error: 'Failed to submit rating' });
    }

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating: newRating,
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update user's own rating
 */
export async function updateRating(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { productId, ratingId } = req.params;
    const { rating, reviewText } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify rating exists and belongs to user
    const { data: existingRating, error: fetchError } = await supabase
      .from('product_ratings')
      .select('id, user_id, product_id')
      .eq('id', ratingId)
      .eq('product_id', productId)
      .single();

    if (fetchError || !existingRating) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    if (existingRating.user_id !== userId) {
      return res.status(403).json({ error: 'You can only update your own ratings' });
    }

    // Update rating
    const { data: updatedRating, error: updateError } = await supabase
      .from('product_ratings')
      .update({
        rating: parseInt(rating, 10),
        review_text: reviewText !== undefined ? (reviewText || null) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ratingId)
      .select('*')
      .single();

    // Fetch user information
    if (updatedRating) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      (updatedRating as any).users = user || null;
    }

    if (updateError) {
      console.error('Update rating error:', updateError);
      return res.status(500).json({ error: 'Failed to update rating' });
    }

    res.json({
      message: 'Rating updated successfully',
      rating: updatedRating,
    });
  } catch (error) {
    console.error('Update rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete user's own rating
 */
export async function deleteRating(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { productId, ratingId } = req.params;

    // Verify rating exists and belongs to user
    const { data: existingRating, error: fetchError } = await supabase
      .from('product_ratings')
      .select('id, user_id, product_id')
      .eq('id', ratingId)
      .eq('product_id', productId)
      .single();

    if (fetchError || !existingRating) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    if (existingRating.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own ratings' });
    }

    // Delete rating
    const { error: deleteError } = await supabase
      .from('product_ratings')
      .delete()
      .eq('id', ratingId);

    if (deleteError) {
      console.error('Delete rating error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete rating' });
    }

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's rating for a specific product (if exists)
 * Also returns whether user has purchased the product
 */
export async function getUserRating(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Check if user has purchased this product
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'completed')
      .limit(1)
      .single();

    const hasPurchased = !orderError && !!order;

    // Get user's rating if exists
    const { data: rating, error } = await supabase
      .from('product_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is acceptable
      console.error('Get user rating error:', error);
      return res.status(500).json({ error: 'Failed to fetch rating' });
    }

    res.json({ 
      rating: rating || null,
      hasPurchased 
    });
  } catch (error) {
    console.error('Get user rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all ratings (for ML training - admin only)
 */
export async function getAllRatings(req: AuthRequest, res: Response) {
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

    // Get all ratings
    const { data: ratings, error } = await supabase
      .from('product_ratings')
      .select('id, user_id, product_id, rating, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get all ratings error:', error);
      return res.status(500).json({ error: 'Failed to fetch ratings' });
    }

    const formattedRatings = ratings?.map((rating: any) => ({
      user_id: rating.user_id,
      product_id: rating.product_id,
      rating: rating.rating,
      created_at: rating.created_at,
    })) || [];

    res.json({ ratings: formattedRatings });
  } catch (error) {
    console.error('Get all ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

