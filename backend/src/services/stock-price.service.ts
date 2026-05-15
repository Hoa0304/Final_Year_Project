/**
 * Stock Price Fluctuation Service
 * 
 * Simulates real-time stock price changes using random walk algorithm
 * Updates stock prices every 10 seconds by default to create an active trading environment
 * 
 * Note: Real stock markets update prices in real-time (every second) during trading hours.
 * For demo purposes, 10 seconds provides a good balance between realism and performance.
 */

import { supabase } from '../utils/supabase';

interface Stock {
  id: string;
  symbol: string;
  current_price: number;
  previous_price: number | null;
  price_change_percent: number;
}

/**
 * Calculate new stock price using random walk with volatility
 * Price changes are bounded to prevent extreme fluctuations
 * 
 * @param currentPrice - Current stock price
 * @param volatility - Volatility factor (0.01 = 1% max change per update)
 * @returns New price and change percentage
 */
function calculateNewPrice(currentPrice: number, volatility: number = 0.02): {
  newPrice: number;
  changePercent: number;
} {
  // Random walk: price can go up or down
  // Use normal distribution for more realistic price movements
  const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
  const changePercent = randomFactor * volatility * 100; // Convert to percentage
  
  // Calculate new price
  const priceChange = currentPrice * (changePercent / 100);
  let newPrice = currentPrice + priceChange;
  
  // Ensure price doesn't go below 1 coin (minimum price)
  if (newPrice < 1) {
    newPrice = 1;
  }
  
  // Calculate actual change percentage
  const actualChangePercent = ((newPrice - currentPrice) / currentPrice) * 100;
  
  return {
    newPrice: Math.round(newPrice * 100) / 100, // Round to 2 decimal places
    changePercent: Math.round(actualChangePercent * 100) / 100
  };
}

/**
 * Update stock prices for all active stocks
 * This simulates market fluctuations
 */
export async function updateStockPrices(): Promise<void> {
  try {
    console.log('📈 Updating stock prices...');
    
    // Get all active stocks
    const { data: stocks, error: fetchError } = await supabase
      .from('stocks')
      .select('id, symbol, current_price, previous_price, price_change_percent')
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('❌ Error fetching stocks:', fetchError);
      return;
    }
    
    if (!stocks || stocks.length === 0) {
      console.log('⚠️  No active stocks found');
      return;
    }
    
    // Update each stock's price
    const updates = stocks.map(async (stock: Stock) => {
      const { newPrice, changePercent } = calculateNewPrice(
        parseFloat(stock.current_price.toString()),
        // Higher volatility for more active trading (2% max change)
        0.02
      );
      
      // Store current price as previous price
      const previousPrice = stock.current_price;
      
      // Update stock in database
      const { error: updateError } = await supabase
        .from('stocks')
        .update({
          previous_price: previousPrice,
          current_price: newPrice,
          price_change_percent: changePercent,
          updated_at: new Date().toISOString()
        })
        .eq('id', stock.id);
      
      if (updateError) {
        console.error(`❌ Error updating stock ${stock.symbol}:`, updateError);
        return;
      }
      
      // Record price history (keep last 100 records per stock)
      await supabase
        .from('stock_price_history')
        .insert({
          stock_id: stock.id,
          price: newPrice,
          price_change_percent: changePercent
        });
      
      // Clean up old history (keep only last 100 records per stock)
      // This is done via a simple query - in production, use a scheduled job
      const { data: history } = await supabase
        .from('stock_price_history')
        .select('id')
        .eq('stock_id', stock.id)
        .order('recorded_at', { ascending: false })
        .range(100, 999999); // Get records beyond the 100th
      
      if (history && history.length > 0) {
        const idsToDelete = history.map(h => h.id);
        await supabase
          .from('stock_price_history')
          .delete()
          .in('id', idsToDelete);
      }
      
      const changeEmoji = changePercent >= 0 ? '📈' : '📉';
      console.log(`   ${changeEmoji} ${stock.symbol}: ${previousPrice} → ${newPrice} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
    });
    
    await Promise.all(updates);
    console.log(`✅ Updated ${stocks.length} stock prices`);
  } catch (error) {
    console.error('❌ Error in updateStockPrices:', error);
  }
}

/**
 * Start the stock price update interval
 * Updates prices every 10 seconds by default (for demo purposes)
 * 
 * Real stock markets: Update every second (real-time) during trading hours
 * Demo/Simulation: 5-10 seconds provides good balance
 * 
 * @param intervalMs - Update interval in milliseconds (default: 10000 = 10 seconds)
 */
export function startStockPriceUpdates(intervalMs: number = 10000): NodeJS.Timeout {
  console.log(`🚀 Starting stock price updates (every ${intervalMs / 1000} seconds)`);
  
  // Update immediately on start
  updateStockPrices();
  
  // Then update at regular intervals
  const interval = setInterval(() => {
    updateStockPrices();
  }, intervalMs);
  
  return interval;
}

/**
 * Stop the stock price update interval
 */
export function stopStockPriceUpdates(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  console.log('🛑 Stopped stock price updates');
}


