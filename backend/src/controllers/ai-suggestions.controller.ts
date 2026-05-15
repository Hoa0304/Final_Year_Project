import { Response } from 'express';
import axios from 'axios';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

const AI_SERVICE_URL = env.AI_SERVICE_URL;

/**
 * Get AI-based item suggestions based on transaction labels and purchase history
 */
export async function getItemSuggestions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { limit = 10, excludeRecent = true } = req.query;

    // Get user's categorized transactions with labels
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select(`
        type,
        amount,
        description,
        category,
        created_at,
        transaction_labels (
          label,
          label_source
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Transform transactions to include label from transaction_labels or fallback to category
    const transactions = (transactionsData || []).map((t: any) => ({
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.transaction_labels && t.transaction_labels.length > 0 
        ? t.transaction_labels[0].label 
        : t.category,
      created_at: t.created_at
    })).filter((t: any) => t.category); // Only include transactions with category/label

    // Get purchase history
    const { data: recentPurchases } = await supabase
      .from('orders')
      .select('product_id, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get available products
    let productsQuery = supabase
      .from('products')
      .select('id, name, description, price, category, image_url, stock_quantity')
      .eq('is_active', true)
      .gt('stock_quantity', 0);

    // Exclude recently purchased products if requested
    if (excludeRecent === 'true' && recentPurchases && recentPurchases.length > 0) {
      const recentProductIds = recentPurchases.map(p => p.product_id);
      productsQuery = productsQuery.not('id', 'in', `(${recentProductIds.join(',')})`);
    }

    const { data: availableProducts } = await productsQuery.limit(100);

    // Call AI service for suggestions
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/suggestions/items`, {
        userId,
        transactions: transactions || [],
        purchaseHistory: recentPurchases || [],
        availableProducts: availableProducts || []
      });

      const suggestions = (response.data.suggestions || []).slice(0, parseInt(limit as string));

      res.json({
        suggestions,
        source: 'ai-engine',
        basedOn: {
          transactionCount: transactions?.length || 0,
          purchaseCount: recentPurchases?.length || 0
        }
      });
    } catch (aiError: any) {
      console.error('AI suggestions error:', aiError.message);
      
      // Fallback: return products from most frequent categories
      const categoryFrequency: { [key: string]: number } = {};
      transactions?.forEach(t => {
        if (t.category) {
          categoryFrequency[t.category] = (categoryFrequency[t.category] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

      const fallbackProducts = availableProducts
        ?.filter(p => topCategories.includes(p.category || ''))
        .slice(0, parseInt(limit as string)) || [];

      res.json({
        suggestions: fallbackProducts.map(p => ({
          productId: p.id,
          productName: p.name,
          productPrice: p.price,
          productCategory: p.category,
          productImageUrl: p.image_url,
          reason: `Based on your ${p.category} purchases`,
          confidence: 0.6
        })),
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('Get item suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

