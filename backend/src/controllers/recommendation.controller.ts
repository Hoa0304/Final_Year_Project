import { Response } from 'express';
import axios from 'axios';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

const AI_SERVICE_URL = env.AI_SERVICE_URL;

/**
 * Get spending recommendations based on user history and balance
 * Calls AI service to generate personalized recommendations
 */
export async function getSpendingRecommendations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get available products
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, category')
      .eq('is_active', true)
      .limit(50);

    // Get available games
    const { data: games } = await supabase
      .from('games')
      .select('id, name, reward_amount, max_plays_per_day')
      .eq('is_active', true);

    // Call AI service
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/recommendations/spending`, {
        userId,
        balance: user?.virtual_balance || 0,
        recentTransactions: transactions || [],
        availableProducts: products || [],
        availableGames: games || []
      });

      // Save recommendations to database
      if (response.data.recommendations) {
        const recommendations = response.data.recommendations.map((rec: any) => ({
          user_id: userId,
          recommendation_type: 'spending',
          title: rec.title,
          description: rec.description,
          action_type: rec.actionType,
          action_id: rec.actionId,
          confidence_score: rec.confidence || 0.5
        }));

        // Delete old recommendations
        await supabase
          .from('ai_recommendations')
          .delete()
          .eq('user_id', userId)
          .eq('recommendation_type', 'spending');

        // Insert new recommendations
        if (recommendations.length > 0) {
          await supabase
            .from('ai_recommendations')
            .insert(recommendations);
        }
      }

      res.json(response.data);
    } catch (aiError: any) {
      console.error('AI service error:', aiError.message);
      
      // Fallback: return basic recommendations from database
      const { data: savedRecommendations } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('recommendation_type', 'spending')
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
        .limit(5);

      res.json({
        recommendations: savedRecommendations || [],
        source: 'cached'
      });
    }
  } catch (error) {
    console.error('Get spending recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get investment recommendations based on user portfolio and balance
 * Calls AI service to generate personalized recommendations
 */
export async function getInvestingRecommendations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    // Get user portfolio
    const { data: portfolio } = await supabase
      .from('user_stocks')
      .select(`
        *,
        stocks (
          id,
          symbol,
          name,
          current_price,
          price_change_percent
        )
      `)
      .eq('user_id', userId);

    // Get available stocks
    const { data: stocks } = await supabase
      .from('stocks')
      .select('id, symbol, name, current_price, price_change_percent')
      .eq('is_active', true);

    // Get stock transaction history
    const { data: stockTransactions } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Call AI service
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/recommendations/investing`, {
        userId,
        balance: user?.virtual_balance || 0,
        portfolio: portfolio || [],
        availableStocks: stocks || [],
        transactionHistory: stockTransactions || []
      });

      // Save recommendations to database
      if (response.data.recommendations) {
        const recommendations = response.data.recommendations.map((rec: any) => ({
          user_id: userId,
          recommendation_type: 'investing',
          title: rec.title,
          description: rec.description,
          action_type: rec.actionType,
          action_id: rec.actionId,
          confidence_score: rec.confidence || 0.5
        }));

        // Delete old recommendations
        await supabase
          .from('ai_recommendations')
          .delete()
          .eq('user_id', userId)
          .eq('recommendation_type', 'investing');

        // Insert new recommendations
        if (recommendations.length > 0) {
          await supabase
            .from('ai_recommendations')
            .insert(recommendations);
        }
      }

      res.json(response.data);
    } catch (aiError: any) {
      console.error('AI service error:', aiError.message);
      
      // Fallback: return basic recommendations from database
      const { data: savedRecommendations } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('recommendation_type', 'investing')
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
        .limit(5);

      res.json({
        recommendations: savedRecommendations || [],
        source: 'cached'
      });
    }
  } catch (error) {
    console.error('Get investing recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get ML-based product recommendations
 * Uses trained ML models (Content-Based, Collaborative, Hybrid) for personalized recommendations
 */
export async function getMLRecommendations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { modelType = 'hybrid', topN = 10 } = req.query;

    // Fetch products from database to pass to AI service
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .limit(1000);

    if (productsError) {
      console.error('Error fetching products:', productsError);
    }

    console.log(`Fetched ${products?.length || 0} products from database`);

    // Calculate ratings for products
    if (products && products.length > 0) {
      const productIds = products.map(p => p.id);
      const { data: allRatings } = await supabase
        .from('product_ratings')
        .select('product_id, rating')
        .in('product_id', productIds);

      const ratingsMap = new Map<string, { total: number; count: number }>();
      allRatings?.forEach((rating) => {
        const existing = ratingsMap.get(rating.product_id) || { total: 0, count: 0 };
        ratingsMap.set(rating.product_id, {
          total: existing.total + rating.rating,
          count: existing.count + 1,
        });
      });

      products.forEach((product: any) => {
        const ratingData = ratingsMap.get(product.id);
        if (ratingData && ratingData.count > 0) {
          product.averageRating = Math.round((ratingData.total / ratingData.count) * 10) / 10;
          product.totalRatings = ratingData.count;
        } else {
          product.averageRating = 0;
          product.totalRatings = 0;
        }
      });
    }

    // Call AI service ML endpoint
    try {
      console.log('Calling AI service ML endpoint:', {
        url: `${AI_SERVICE_URL}/ml/recommendations`,
        userId,
        modelType: modelType as string,
        topN: parseInt(topN as string, 10) || 10,
        productsCount: products?.length || 0,
      });

      const response = await axios.post(`${AI_SERVICE_URL}/ml/recommendations`, {
        userId,
        modelType: modelType as string,
        topN: parseInt(topN as string, 10) || 10,
        products: products || [], // Pass products directly
      }, {
        timeout: 10000, // 10 second timeout
      });

      console.log('AI service response:', {
        recommendationsCount: response.data.recommendations?.length || 0,
        source: response.data.source,
        model: response.data.model,
        hasError: !!response.data.error,
      });

      res.json(response.data);
    } catch (aiError: any) {
      console.error('ML recommendations error:', aiError.message);
      console.error('AI Service URL:', AI_SERVICE_URL);
      console.error('Error details:', aiError.response?.data || aiError.message);
      
      // Return empty recommendations instead of falling back
      // Frontend will handle empty state
      res.json({
        recommendations: [],
        source: 'ml-model',
        model: modelType as string,
        count: 0,
        error: 'ML service unavailable',
      });
    }
  } catch (error) {
    console.error('Get ML recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

