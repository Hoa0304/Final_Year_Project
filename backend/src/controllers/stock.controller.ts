import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { createTransaction } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get all active stocks with current prices
 */
export async function getStocks(req: Request, res: Response) {
  try {
    const { data: stocks, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('is_active', true)
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Get stocks error:', error);
      return res.status(500).json({ error: 'Failed to fetch stocks' });
    }

    res.json({ stocks });
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get stock by ID
 */
export async function getStockById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { data: stock, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({ stock });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Buy stocks
 * Validates balance, creates stock transaction, updates portfolio
 */
export async function buyStock(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { stockId, quantity } = req.body;

    if (!stockId || !quantity) {
      return res.status(400).json({ error: 'Stock ID and quantity are required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Get stock details
    const { data: stock, error: stockError } = await supabase
      .from('stocks')
      .select('*')
      .eq('id', stockId)
      .eq('is_active', true)
      .single();

    if (stockError || !stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Calculate total cost
    const totalCost = stock.current_price * quantity;

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
    if (user.virtual_balance < totalCost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get existing portfolio entry
    const { data: existingPortfolio } = await supabase
      .from('user_stocks')
      .select('*')
      .eq('user_id', userId)
      .eq('stock_id', stockId)
      .single();

    let newQuantity: number;
    let newAveragePrice: number;

    if (existingPortfolio) {
      // Calculate new average price (weighted average)
      const totalOldValue = existingPortfolio.quantity * existingPortfolio.average_buy_price;
      const totalNewValue = quantity * stock.current_price;
      newQuantity = existingPortfolio.quantity + quantity;
      newAveragePrice = (totalOldValue + totalNewValue) / newQuantity;

      // Update portfolio
      await supabase
        .from('user_stocks')
        .update({
          quantity: newQuantity,
          average_buy_price: newAveragePrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPortfolio.id);
    } else {
      // Create new portfolio entry
      newQuantity = quantity;
      newAveragePrice = stock.current_price;

      await supabase
        .from('user_stocks')
        .insert({
          user_id: userId,
          stock_id: stockId,
          quantity: newQuantity,
          average_buy_price: newAveragePrice
        });
    }

    // Create stock transaction record
    const { data: stockTransaction, error: transactionError } = await supabase
      .from('stock_transactions')
      .insert({
        user_id: userId,
        stock_id: stockId,
        transaction_type: 'buy',
        quantity,
        price: stock.current_price,
        total_amount: totalCost
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Create stock transaction error:', transactionError);
      return res.status(500).json({ error: 'Failed to record transaction' });
    }

    // Deduct coins
    await createTransaction({
      userId,
      type: 'spend',
      amount: totalCost,
      description: `Bought ${quantity} shares of ${stock.symbol} at ${stock.current_price}`,
      referenceId: stockTransaction.id,
      referenceType: 'stock'
    });

    res.json({
      message: 'Stock purchased successfully',
      transaction: {
        id: stockTransaction.id,
        stock: stock.symbol,
        quantity,
        price: stock.current_price,
        totalCost
      },
      portfolio: {
        quantity: newQuantity,
        averagePrice: newAveragePrice
      }
    });
  } catch (error) {
    console.error('Buy stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Sell stocks
 * Validates ownership, calculates profit/loss, updates portfolio
 */
export async function sellStock(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { stockId, quantity } = req.body;

    if (!stockId || !quantity) {
      return res.status(400).json({ error: 'Stock ID and quantity are required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Get stock details
    const { data: stock, error: stockError } = await supabase
      .from('stocks')
      .select('*')
      .eq('id', stockId)
      .eq('is_active', true)
      .single();

    if (stockError || !stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Get user portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('user_stocks')
      .select('*')
      .eq('user_id', userId)
      .eq('stock_id', stockId)
      .single();

    if (portfolioError || !portfolio) {
      return res.status(404).json({ error: 'You do not own this stock' });
    }

    if (portfolio.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient shares to sell' });
    }

    // Calculate sale proceeds
    const saleProceeds = stock.current_price * quantity;
    const costBasis = portfolio.average_buy_price * quantity;
    const profit = saleProceeds - costBasis;

    // Update portfolio
    const newQuantity = portfolio.quantity - quantity;

    if (newQuantity === 0) {
      // Remove portfolio entry if all shares sold
      await supabase
        .from('user_stocks')
        .delete()
        .eq('id', portfolio.id);
    } else {
      // Update quantity
      await supabase
        .from('user_stocks')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolio.id);
    }

    // Create stock transaction record
    const { data: stockTransaction, error: transactionError } = await supabase
      .from('stock_transactions')
      .insert({
        user_id: userId,
        stock_id: stockId,
        transaction_type: 'sell',
        quantity,
        price: stock.current_price,
        total_amount: saleProceeds
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Create stock transaction error:', transactionError);
      return res.status(500).json({ error: 'Failed to record transaction' });
    }

    // Add coins from sale
    await createTransaction({
      userId,
      type: profit >= 0 ? 'stock_profit' : 'stock_loss',
      amount: saleProceeds,
      description: `Sold ${quantity} shares of ${stock.symbol} at ${stock.current_price}. ${profit >= 0 ? 'Profit' : 'Loss'}: ${Math.abs(profit)}`,
      referenceId: stockTransaction.id,
      referenceType: 'stock'
    });

    res.json({
      message: 'Stock sold successfully',
      transaction: {
        id: stockTransaction.id,
        stock: stock.symbol,
        quantity,
        price: stock.current_price,
        saleProceeds,
        profit,
        costBasis
      }
    });
  } catch (error) {
    console.error('Sell stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's stock portfolio
 */
export async function getPortfolio(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { data: portfolio, error } = await supabase
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

    if (error) {
      console.error('Get portfolio error:', error);
      return res.status(500).json({ error: 'Failed to fetch portfolio' });
    }

    // Calculate current value and profit/loss for each holding
    const portfolioWithValue = portfolio.map((holding: any) => {
      const currentValue = holding.quantity * holding.stocks.current_price;
      const costBasis = holding.quantity * holding.average_buy_price;
      const profit = currentValue - costBasis;
      const profitPercent = (profit / costBasis) * 100;

      return {
        ...holding,
        currentValue,
        costBasis,
        profit,
        profitPercent
      };
    });

    res.json({ portfolio: portfolioWithValue });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's holding for a specific stock
 */
export async function getStockHolding(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id: stockId } = req.params;

    const { data: holding, error } = await supabase
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
      .eq('user_id', userId)
      .eq('stock_id', stockId)
      .single();

    if (error || !holding) {
      // User doesn't own this stock
      return res.json({ holding: null });
    }

    // Calculate current value and profit/loss
    const currentValue = holding.quantity * holding.stocks.current_price;
    const costBasis = holding.quantity * holding.average_buy_price;
    const profit = currentValue - costBasis;
    const profitPercent = (profit / costBasis) * 100;

    res.json({
      holding: {
        ...holding,
        currentValue,
        costBasis,
        profit,
        profitPercent
      }
    });
  } catch (error) {
    console.error('Get stock holding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's stock transaction history
 */
export async function getStockTransactions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: transactions, error } = await supabase
      .from('stock_transactions')
      .select(`
        *,
        stocks (
          symbol,
          name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get stock transactions error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json({ transactions });
  } catch (error) {
    console.error('Get stock transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get stock price history
 */
export async function getStockPriceHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify stock exists
    const { data: stock, error: stockError } = await supabase
      .from('stocks')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (stockError || !stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Get price history
    const { data: history, error } = await supabase
      .from('stock_price_history')
      .select('price, price_change_percent, recorded_at')
      .eq('stock_id', id)
      .order('recorded_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Get stock price history error:', error);
      return res.status(500).json({ error: 'Failed to fetch price history' });
    }

    res.json({ history: history || [] });
  } catch (error) {
    console.error('Get stock price history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


