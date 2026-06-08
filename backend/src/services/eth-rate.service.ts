/**
 * ETH Exchange Rate Service - Mocked for Fixed Coin Rate
 * Uses a fixed conversion rate of 1 coin = 1000 VND.
 */

// Cached mock rate for compatibility
const cachedRate = {
  ethVnd: 10_000, // 0.0001 ETH * 10,000 VND/ETH = 1 VND/coin
  updatedAt: new Date(),
  source: 'mock' as const,
};

// ETH per 1 coin (kept for frontend/backend display compatibility)
export const ETH_PER_COIN = 0.0001;

/**
 * Get the current exchange rate (fixed mock rate).
 */
export async function getEthVndRate() {
  return cachedRate;
}

/**
 * Convert coins to VND based on fixed rate (1 coin = 1 VND)
 * @param coins Number of coins
 * @returns VND amount
 */
export async function coinsToVnd(coins: number): Promise<number> {
  return Math.round(coins);
}

/**
 * Convert VND to coins based on fixed rate (1 coin = 1 VND)
 * @param vnd VND amount
 * @returns Coins equivalent
 */
export async function vndToCoins(vnd: number): Promise<number> {
  return Math.round(vnd);
}

/**
 * Get the coin discount price in VND (no automatic 10% discount)
 * @param priceVnd Full VND price
 * @returns Full VND price
 */
export function getCoinDiscountPrice(priceVnd: number): number {
  return priceVnd;
}

/**
 * Get the coin price (how many coins needed) under 1:1 rate
 * @param priceVnd Full VND price
 * @returns Coins needed
 */
export async function getCoinPriceForProduct(priceVnd: number): Promise<number> {
  return priceVnd;
}

/**
 * Clear rate cache (no-op)
 */
export function clearRateCache(): void {
  // No-op
}

