import api from '../config/api';

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  previous_price?: number;
  price_change_percent: number;
  description?: string;
  is_active: boolean;
}

export interface StocksResponse {
  stocks: Stock[];
}

export interface PortfolioItem {
  id: string;
  quantity: number;
  average_buy_price: number;
  stocks: Stock;
  currentValue: number;
  costBasis: number;
  profit: number;
  profitPercent: number;
}

export interface PortfolioResponse {
  portfolio: PortfolioItem[];
}

export interface StockTransaction {
  id: string;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_amount: number;
  created_at: string;
  stocks: {
    symbol: string;
    name: string;
  };
}

export interface StockTransactionsResponse {
  transactions: StockTransaction[];
}

export interface BuyStockResponse {
  message: string;
  transaction: {
    id: string;
    stock: string;
    quantity: number;
    price: number;
    totalCost: number;
  };
  portfolio: {
    quantity: number;
    averagePrice: number;
  };
}

export interface SellStockResponse {
  message: string;
  transaction: {
    id: string;
    stock: string;
    quantity: number;
    price: number;
    saleProceeds: number;
    profit: number;
    costBasis: number;
  };
}

/**
 * Get all stocks
 */
export async function getStocks(): Promise<Stock[]> {
  const response = await api.get<StocksResponse>('/stocks');
  return response.data.stocks;
}

/**
 * Get stock by ID
 */
export async function getStockById(id: string): Promise<Stock> {
  const response = await api.get<{ stock: Stock }>(`/stocks/${id}`);
  return response.data.stock;
}

/**
 * Buy stocks
 * React Query v5 passes the entire mutation variables object as the first parameter
 */
export async function buyStock(variables: { stockId: string; quantity: number }): Promise<BuyStockResponse> {
  const { stockId, quantity } = variables;
  const response = await api.post<BuyStockResponse>('/stocks/buy', {
    stockId,
    quantity,
  });
  return response.data;
}

/**
 * Sell stocks
 * React Query v5 passes the entire mutation variables object as the first parameter
 */
export async function sellStock(variables: { stockId: string; quantity: number }): Promise<SellStockResponse> {
  const { stockId, quantity } = variables;
  const response = await api.post<SellStockResponse>('/stocks/sell', {
    stockId,
    quantity,
  });
  return response.data;
}

/**
 * Get user's portfolio
 */
export async function getPortfolio(): Promise<PortfolioItem[]> {
  const response = await api.get<PortfolioResponse>('/stocks/portfolio/me');
  return response.data.portfolio;
}

/**
 * Get user's stock transaction history
 */
export async function getStockTransactions(limit = 50, offset = 0): Promise<StockTransaction[]> {
  const response = await api.get<StockTransactionsResponse>('/stocks/transactions/me', {
    params: { limit, offset },
  });
  return response.data.transactions;
}

export interface StockPriceHistoryItem {
  price: number;
  price_change_percent: number;
  recorded_at: string;
}

export interface StockPriceHistoryResponse {
  history: StockPriceHistoryItem[];
}

/**
 * Get stock price history
 */
export async function getStockPriceHistory(stockId: string, limit = 50): Promise<StockPriceHistoryItem[]> {
  const response = await api.get<StockPriceHistoryResponse>(`/stocks/${stockId}/history`, {
    params: { limit },
  });
  return response.data.history;
}

export interface StockHolding {
  id: string;
  quantity: number;
  average_buy_price: number;
  stocks: Stock;
  currentValue: number;
  costBasis: number;
  profit: number;
  profitPercent: number;
}

export interface StockHoldingResponse {
  holding: StockHolding | null;
}

/**
 * Get user's holding for a specific stock
 */
export async function getStockHolding(stockId: string): Promise<StockHolding | null> {
  const response = await api.get<StockHoldingResponse>(`/stocks/${stockId}/holding`);
  return response.data.holding;
}

