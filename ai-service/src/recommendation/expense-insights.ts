/**
 * Expense Insights Engine
 * 
 * This module provides AI-based expense insights, recommendations, and alerts
 * for intelligent expense management.
 */

interface Transaction {
  type: string;
  amount: number;
  description?: string;
  category?: string;
  created_at: string;
}

interface ExpenseInsightsInput {
  userId: string;
  balance: number;
  period: 'day' | 'week' | 'month' | 'year';
  totalSpending: number;
  totalEarnings: number;
  netAmount: number;
  categoryBreakdown: { [category: string]: { amount: number; count: number } };
  recentTransactions: Transaction[];
  dailyTrend: Array<{ date: string; amount: number }>;
}

export interface ExpenseInsight {
  type: 'warning' | 'suggestion' | 'alert' | 'insight' | 'tip';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionType?: 'save' | 'reduce' | 'diversify' | 'budget' | 'earn';
  category?: string;
  amount?: number;
  confidence: number;
}

/**
 * Generate expense insights and recommendations
 */
export function getExpenseInsights(input: ExpenseInsightsInput): ExpenseInsight[] {
  const insights: ExpenseInsight[] = [];
  const {
    balance,
    period,
    totalSpending,
    totalEarnings,
    netAmount,
    categoryBreakdown,
    recentTransactions,
    dailyTrend,
  } = input;

  // 1. Negative Net Amount Warning
  if (netAmount < 0) {
    insights.push({
      type: 'warning',
      title: '⚠️ Spending Exceeds Earnings',
      message: `You're spending ${Math.abs(netAmount).toFixed(2)} coins more than you earn this ${period}. Consider reducing expenses or earning more.`,
      priority: 'high',
      actionType: 'reduce',
      amount: Math.abs(netAmount),
      confidence: 0.95,
    });
  }

  // 2. High Spending Rate Alert
  const spendingRate = totalSpending / Math.max(totalEarnings, 1);
  if (spendingRate > 0.9 && totalEarnings > 0) {
    insights.push({
      type: 'alert',
      title: '🚨 High Spending Rate',
      message: `You're spending ${(spendingRate * 100).toFixed(0)}% of your earnings. Consider saving more for future purchases.`,
      priority: 'high',
      actionType: 'save',
      confidence: 0.9,
    });
  }

  // 3. Category Concentration Warning
  const categories = Object.entries(categoryBreakdown);
  if (categories.length > 0) {
    const topCategory = categories.sort((a, b) => b[1].amount - a[1].amount)[0];
    const topCategoryPercentage = (topCategory[1].amount / totalSpending) * 100;
    
    if (topCategoryPercentage > 60 && totalSpending > 0) {
      insights.push({
        type: 'suggestion',
        title: '💡 Diversify Your Spending',
        message: `${topCategory[0]} accounts for ${topCategoryPercentage.toFixed(0)}% of your spending. Try exploring other categories for better balance.`,
        priority: 'medium',
        actionType: 'diversify',
        category: topCategory[0],
        confidence: 0.8,
      });
    }
  }

  // 4. Low Balance Alert
  if (balance < 50 && totalSpending > 0) {
    insights.push({
      type: 'alert',
      title: '💰 Low Balance Warning',
      message: `Your balance is low (${balance.toFixed(2)} coins). Consider completing tasks or playing games to earn more coins.`,
      priority: 'high',
      actionType: 'earn',
      confidence: 0.9,
    });
  }

  // 5. Spending Trend Analysis
  if (dailyTrend.length >= 7) {
    const recent7Days = dailyTrend.slice(-7);
    const earlier7Days = dailyTrend.slice(-14, -7);
    
    if (earlier7Days.length >= 7) {
      const recentAvg = recent7Days.reduce((sum, d) => sum + d.amount, 0) / 7;
      const earlierAvg = earlier7Days.reduce((sum, d) => sum + d.amount, 0) / 7;
      const trendChange = ((recentAvg - earlierAvg) / Math.max(earlierAvg, 1)) * 100;

      if (trendChange > 30) {
        insights.push({
          type: 'warning',
          title: '📈 Spending Trend Increasing',
          message: `Your spending has increased by ${trendChange.toFixed(0)}% compared to the previous week. Monitor your expenses closely.`,
          priority: 'medium',
          actionType: 'reduce',
          confidence: 0.85,
        });
      } else if (trendChange < -20) {
        insights.push({
          type: 'insight',
          title: '✅ Spending Trend Decreasing',
          message: `Great! Your spending has decreased by ${Math.abs(trendChange).toFixed(0)}% compared to the previous week. Keep it up!`,
          priority: 'low',
          actionType: 'save',
          confidence: 0.85,
        });
      }
    }
  }

  // 6. Budget Recommendation
  if (totalEarnings > 0) {
    const recommendedBudget = totalEarnings * 0.7; // 70% of earnings
    if (totalSpending > recommendedBudget) {
      insights.push({
        type: 'suggestion',
        title: '💼 Budget Recommendation',
        message: `Consider setting a budget of ${recommendedBudget.toFixed(2)} coins (70% of earnings) to maintain healthy spending habits.`,
        priority: 'medium',
        actionType: 'budget',
        amount: recommendedBudget,
        confidence: 0.75,
      });
    }
  }

  // 7. Unusual Spending Pattern Detection
  if (recentTransactions.length >= 5) {
    const amounts = recentTransactions
      .filter(t => t.type === 'spend')
      .map(t => parseFloat(t.amount.toString()));
    
    if (amounts.length >= 3) {
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      // Check for unusually large transactions
      const largeTransactions = amounts.filter(a => a > avgAmount + 2 * stdDev);
      if (largeTransactions.length > 0) {
        insights.push({
          type: 'insight',
          title: '🔍 Unusual Spending Detected',
          message: `You have ${largeTransactions.length} unusually large transaction(s). Review them to ensure they're necessary.`,
          priority: 'medium',
          actionType: 'reduce',
          confidence: 0.7,
        });
      }
    }
  }

  // 8. Savings Opportunity
  if (netAmount > 0 && netAmount > 100) {
    insights.push({
      type: 'tip',
      title: '💎 Savings Opportunity',
      message: `You have ${netAmount.toFixed(2)} coins saved this ${period}. Consider investing in stocks or saving for bigger purchases.`,
      priority: 'low',
      actionType: 'save',
      confidence: 0.8,
    });
  }

  // 9. Category-Specific Tips
  categories.forEach(([category, data]) => {
    const categoryPercentage = (data.amount / totalSpending) * 100;
    
    if (categoryPercentage > 40 && category === 'Shopping') {
      insights.push({
        type: 'suggestion',
        title: '🛒 Shopping Category High',
        message: `Shopping accounts for ${categoryPercentage.toFixed(0)}% of your spending. Consider if all purchases are necessary.`,
        priority: 'medium',
        actionType: 'reduce',
        category: category,
        confidence: 0.75,
      });
    }
  });

  // 10. Earning vs Spending Balance
  if (totalEarnings > 0) {
    const earningSpendingRatio = totalSpending / totalEarnings;
    if (earningSpendingRatio < 0.5) {
      insights.push({
        type: 'insight',
        title: '🌟 Excellent Savings Rate',
        message: `You're saving ${((1 - earningSpendingRatio) * 100).toFixed(0)}% of your earnings. Excellent financial discipline!`,
        priority: 'low',
        actionType: 'save',
        confidence: 0.9,
      });
    }
  }

  // Sort by priority and confidence
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return insights
    .sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    })
    .slice(0, 8); // Return top 8 insights
}

/**
 * Predict future spending based on historical data
 */
export function predictFutureSpending(
  dailyTrend: Array<{ date: string; amount: number }>,
  days: number = 7
): { predictedAmount: number; confidence: number; trend: 'increasing' | 'decreasing' | 'stable' } {
  if (dailyTrend.length < 7) {
    return {
      predictedAmount: 0,
      confidence: 0.3,
      trend: 'stable',
    };
  }

  // Simple linear regression for trend
  const recentData = dailyTrend.slice(-14); // Use last 14 days
  const n = recentData.length;
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  recentData.forEach((point, index) => {
    const x = index;
    const y = point.amount;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict next period
  const predictedAmount = (slope * n + intercept) * days;
  const avgAmount = sumY / n;
  
  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (slope > avgAmount * 0.1) {
    trend = 'increasing';
  } else if (slope < -avgAmount * 0.1) {
    trend = 'decreasing';
  }

  // Confidence based on data consistency
  const variance = recentData.reduce((sum, p) => {
    const expected = slope * recentData.indexOf(p) + intercept;
    return sum + Math.pow(p.amount - expected, 2);
  }, 0) / n;
  const confidence = Math.max(0.3, Math.min(0.9, 1 - (variance / (avgAmount * avgAmount + 1))));

  return {
    predictedAmount: Math.max(0, predictedAmount),
    confidence,
    trend,
  };
}















