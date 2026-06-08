import { Response } from 'express';
import axios from 'axios';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

const AI_SERVICE_URL = env.AI_SERVICE_URL;

/**
 * Get user transactions with labels
 */
export async function getCategorizedTransactions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { label, limit = 50, offset = 0, category } = req.query;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        transaction_labels (
          label,
          label_source,
          confidence_score
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Get transactions error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    console.log(`📊 Found ${transactions?.length || 0} transactions for user ${userId}`);

    // Filter by label if provided
    let filteredTransactions = transactions || [];
    if (label) {
      filteredTransactions = filteredTransactions.filter((t: any) => 
        t.transaction_labels && t.transaction_labels.length > 0 && 
        t.transaction_labels[0].label === label
      );
    }

    // Filter by category if provided (from transaction_labels)
    if (category) {
      filteredTransactions = filteredTransactions.filter((t: any) => {
        const txLabel = t.transaction_labels && t.transaction_labels.length > 0 ? t.transaction_labels[0].label : null;
        return txLabel === category;
      });
    }

    // Transform to include label in transaction object
    const transformed = filteredTransactions.map((t: any) => {
      const labelData = t.transaction_labels && t.transaction_labels.length > 0 ? t.transaction_labels[0] : null;
      return {
        ...t,
        category: labelData?.label || null,
        is_manual_label: labelData?.label_source === 'manual' || false,
        label: labelData?.label || null,
        labelSource: labelData?.label_source || null,
        labelConfidence: labelData?.confidence_score || null
      };
    });

    console.log(`📊 Returning ${transformed.length} transactions after filtering`);
    res.json({ transactions: transformed });
  } catch (error) {
    console.error('Get categorized transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update transaction label (manual override)
 */
export async function updateTransactionLabel(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { transactionId } = req.params;
    const { label } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }

    // Get the transaction to check ownership
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('id, user_id')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get existing label
    const { data: existingLabel } = await supabase
      .from('transaction_labels')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    const originalLabel = existingLabel?.label;

    // Upsert transaction label
    const { data: updated, error: updateError } = await supabase
      .from('transaction_labels')
      .upsert({
        transaction_id: transactionId,
        user_id: userId,
        label,
        label_source: 'manual',
        confidence_score: 1.0, // Manual labels have 100% confidence
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'transaction_id'
      })
      .select()
      .single();

    if (updateError) {
      console.error('Update transaction label error:', updateError);
      return res.status(500).json({ error: 'Failed to update label' });
    }

    res.json({ 
      label: updated,
      message: 'Label updated successfully' 
    });
  } catch (error) {
    console.error('Update transaction label error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Categorize a transaction using AI
 */
export async function categorizeTransaction(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { transactionId } = req.params;

    // Get transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get product info if this is an order transaction
    let productCategory: string | undefined;
    let productName: string | undefined;
    
    if (transaction.reference_type === 'order' && transaction.reference_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('product_id, products(category, name)')
        .eq('id', transaction.reference_id)
        .single();
      
      if (order && (order as any).products) {
        productCategory = (order as any).products.category;
        productName = (order as any).products.name;
      }
    }

    // Get user's label history for context
    const { data: labelHistory } = await supabase
      .from('transaction_labels')
      .select('label')
      .eq('user_id', userId)
      .not('label', 'is', null);

    // Count labels
    const labelCounts: { [key: string]: number } = {};
    labelHistory?.forEach((l: any) => {
      labelCounts[l.label] = (labelCounts[l.label] || 0) + 1;
    });

    const userHistory = Object.entries(labelCounts).map(([label, count]) => ({
      label,
      count
    }));

    // Call AI service for categorization
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/categorize-transaction`, {
        transaction: {
          type: transaction.type,
          amount: parseFloat(transaction.amount.toString()),
          description: transaction.description || '',
          reference_type: transaction.reference_type
        },
        userHistory: labelHistory?.map((l: any) => ({
          type: '',
          amount: 0,
          description: '',
          category: l.label
        })) || []
      });

      const suggestedLabel = response.data.category || 'other';
      const confidence = response.data.confidence || 0.5;

      // Check if label already exists (manual override takes precedence)
      const { data: existingLabel } = await supabase
        .from('transaction_labels')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      // Only update if no manual label exists
      if (!existingLabel || existingLabel.label_source === 'auto') {
        await supabase
          .from('transaction_labels')
          .upsert({
            transaction_id: transactionId,
            user_id: userId,
            label: suggestedLabel,
            label_source: 'auto',
            confidence_score: confidence,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'transaction_id'
          });
      }

      res.json({
        label: existingLabel && existingLabel.label_source === 'manual' 
          ? existingLabel.label 
          : suggestedLabel,
        confidence: existingLabel && existingLabel.label_source === 'manual' 
          ? 1.0 
          : confidence,
        source: existingLabel && existingLabel.label_source === 'manual' 
          ? 'manual' 
          : 'auto'
      });
    } catch (aiError: any) {
      console.error('AI categorization error:', aiError.message);
      // Fallback: use existing label or default
      const { data: existingLabel } = await supabase
        .from('transaction_labels')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      res.json({
        label: existingLabel?.label || 'other',
        confidence: existingLabel?.confidence_score || 0.3,
        source: existingLabel?.label_source || 'auto'
      });
    }
  } catch (error) {
    console.error('Categorize transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get transaction categories summary
 */
export async function getTransactionCategories(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        transaction_labels (
          label
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Get categories error:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    // Group by category
    const categorySummary: { [key: string]: { count: number; totalAmount: number } } = {};
    
    transactions?.forEach((t: any) => {
      const label = t.transaction_labels?.[0]?.label || 'Uncategorized';
      if (!categorySummary[label]) {
        categorySummary[label] = { count: 0, totalAmount: 0 };
      }
      categorySummary[label].count++;
      if (t.type === 'spend') {
        categorySummary[label].totalAmount += parseFloat(t.amount.toString());
      } else {
        categorySummary[label].totalAmount -= parseFloat(t.amount.toString());
      }
    });

    res.json({ categories: categorySummary });
  } catch (error) {
    console.error('Get transaction categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get AI-based item suggestions based on transaction labels
 */
export async function getLabelBasedSuggestions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    // Get user's transaction labels
    const { data: labels } = await supabase
      .from('transaction_labels')
      .select('label')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Count label frequency
    const labelCounts: { [key: string]: number } = {};
    labels?.forEach((l: any) => {
      labelCounts[l.label] = (labelCounts[l.label] || 0) + 1;
    });

    // Get top 3 most frequent labels
    const topLabels = Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);

    // Get user balance
    const { data: user } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    // Get products matching top labels
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .in('category', topLabels.length > 0 ? topLabels : ['electronics', 'groceries', 'entertainment'])
      .limit(10);

    // Get recent purchases to avoid suggesting recently bought items
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('product_id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentProductIds = new Set(recentOrders?.map((o: any) => o.product_id) || []);

    // Filter out recently purchased products
    const suggestedProducts = products?.filter(p => !recentProductIds.has(p.id)) || [];

    // Sort by relevance (category match) and price
    const suggestions = suggestedProducts
      .map(product => {
        const relevance = topLabels.includes(product.category?.toLowerCase() || '') ? 1 : 0.5;
        return {
          product,
          relevance,
          matchesLabel: topLabels.includes(product.category?.toLowerCase() || '')
        };
      })
      .sort((a, b) => {
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;
        return a.product.price - b.product.price;
      })
      .slice(0, 5)
      .map(s => ({
        id: s.product.id,
        name: s.product.name,
        price: s.product.price,
        category: s.product.category,
        imageUrl: s.product.image_url,
        reason: s.matchesLabel 
          ? `Based on your ${topLabels[0]} purchases` 
          : 'Recommended for you'
      }));

    res.json({
      suggestions,
      basedOnLabels: topLabels
    });
  } catch (error) {
    console.error('Get label-based suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get expense statistics for expense management
 * Returns spending by category, time period, and trends
 */
export async function getExpenseStatistics(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { period = 'month' } = req.query; // 'day', 'week', 'month', 'year'

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all spending transactions in the period
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        description,
        created_at,
        transaction_labels (
          label
        )
      `)
      .eq('user_id', userId)
      .in('type', ['spend', 'revoke'])
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (transError) {
      console.error('Get expense statistics error:', transError);
      return res.status(500).json({ error: 'Failed to fetch expense statistics' });
    }

    // Get all earning transactions in the period
    const { data: earnings, error: earnError } = await supabase
      .from('transactions')
      .select('amount, type, created_at')
      .eq('user_id', userId)
      .in('type', ['earn', 'grant', 'task_reward', 'stock_profit'])
      .gte('created_at', startDate.toISOString());

    // Calculate totals
    const totalSpending = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
    const totalEarnings = earnings?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
    const netAmount = totalEarnings - totalSpending;

    // Group by category
    const categoryBreakdown: { [key: string]: { amount: number; count: number; transactions: any[] } } = {};
    
    transactions?.forEach((t: any) => {
      const category = t.transaction_labels?.[0]?.label || 'Uncategorized';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { amount: 0, count: 0, transactions: [] };
      }
      categoryBreakdown[category].amount += parseFloat(t.amount.toString());
      categoryBreakdown[category].count++;
      categoryBreakdown[category].transactions.push({
        id: t.id,
        amount: parseFloat(t.amount.toString()),
        description: t.description,
        date: t.created_at,
      });
    });

    // Get daily spending for trend (last 30 days)
    const trendStartDate = new Date(now);
    trendStartDate.setDate(now.getDate() - 30);
    
    const { data: trendTransactions } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('user_id', userId)
      .in('type', ['spend', 'revoke'])
      .gte('created_at', trendStartDate.toISOString())
      .order('created_at', { ascending: true });

    // Group by date
    const dailyTrend: { [key: string]: number } = {};
    trendTransactions?.forEach((t: any) => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      dailyTrend[date] = (dailyTrend[date] || 0) + parseFloat(t.amount.toString());
    });

    // Get top spending categories
    const topCategories = Object.entries(categoryBreakdown)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    res.json({
      period,
      summary: {
        totalSpending,
        totalEarnings,
        netAmount,
        transactionCount: transactions?.length || 0,
      },
      categoryBreakdown,
      topCategories,
      dailyTrend: Object.entries(dailyTrend).map(([date, amount]) => ({ date, amount })),
    });
  } catch (error) {
    console.error('Get expense statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get AI expense insights and recommendations
 */
export async function getExpenseInsights(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { period = 'month' } = req.query;

    // Get expense statistics
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get spending transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        description,
        created_at,
        transaction_labels (
          label
        )
      `)
      .eq('user_id', userId)
      .in('type', ['spend', 'revoke'])
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Get earning transactions
    const { data: earnings } = await supabase
      .from('transactions')
      .select('amount, type, created_at')
      .eq('user_id', userId)
      .in('type', ['earn', 'grant', 'task_reward', 'stock_profit'])
      .gte('created_at', startDate.toISOString());

    const totalSpending = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
    const totalEarnings = earnings?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
    const netAmount = totalEarnings - totalSpending;

    // Group by category
    const categoryBreakdown: { [key: string]: { amount: number; count: number } } = {};
    transactions?.forEach((t: any) => {
      const category = t.transaction_labels?.[0]?.label || 'Uncategorized';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { amount: 0, count: 0 };
      }
      categoryBreakdown[category].amount += parseFloat(t.amount.toString());
      categoryBreakdown[category].count++;
    });

    // Get daily trend
    const trendStartDate = new Date(now);
    trendStartDate.setDate(now.getDate() - 30);
    const { data: trendTransactions } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('user_id', userId)
      .in('type', ['spend', 'revoke'])
      .gte('created_at', trendStartDate.toISOString())
      .order('created_at', { ascending: true });

    const dailyTrend: { [key: string]: number } = {};
    trendTransactions?.forEach((t: any) => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      dailyTrend[date] = (dailyTrend[date] || 0) + parseFloat(t.amount.toString());
    });

    // Get user balance
    const { data: user } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    // Call AI service
    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/insights/expense`, {
        userId,
        balance: user?.virtual_balance || 0,
        period,
        totalSpending,
        totalEarnings,
        netAmount,
        categoryBreakdown,
        recentTransactions: transactions?.slice(0, 20).map((t: any) => ({
          type: t.type,
          amount: parseFloat(t.amount.toString()),
          description: t.description,
          category: t.transaction_labels?.[0]?.label,
          created_at: t.created_at,
        })) || [],
        dailyTrend: Object.entries(dailyTrend).map(([date, amount]) => ({ date, amount })),
      });

      res.json(aiResponse.data);
    } catch (aiError: any) {
      console.error('AI service error:', aiError.message);
      
      // Fallback insights
      const insights = [];
      if (netAmount < 0) {
        insights.push({
          type: 'warning',
          title: '⚠️ Spending Exceeds Earnings',
          message: `You're spending ${Math.abs(netAmount).toFixed(2)} coins more than you earn.`,
          priority: 'high',
          confidence: 0.9,
        });
      }

      res.json({
        insights,
        prediction: { predictedAmount: 0, confidence: 0.3, trend: 'stable' },
        source: 'fallback',
      });
    }
  } catch (error) {
    console.error('Get expense insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
