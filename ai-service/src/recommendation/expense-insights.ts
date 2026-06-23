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

  const periodMap = { day: 'ngày', week: 'tuần', month: 'tháng', year: 'năm' };
  const pName = periodMap[period] || period;

  // 1. Negative Net Amount Warning
  if (netAmount < 0) {
    insights.push({
      type: 'warning',
      title: '⚠️ Chi tiêu vượt thu nhập',
      message: `Bạn đang chi tiêu nhiều hơn ${Math.abs(netAmount).toFixed(2)} xu so với thu nhập trong ${pName} này. Hãy cân nhắc cắt giảm chi tiêu hoặc tăng thu nhập.`,
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
      title: '🚨 Tỷ lệ chi tiêu cao',
      message: `Bạn đang chi tiêu ${(spendingRate * 100).toFixed(0)}% thu nhập của mình. Hãy cân nhắc tiết kiệm thêm cho các khoản mua sắm trong tương lai.`,
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
        title: '💡 Đa dạng hóa chi tiêu',
        message: `Danh mục ${topCategory[0]} chiếm ${topCategoryPercentage.toFixed(0)}% chi tiêu của bạn. Hãy thử khám phá các danh mục khác để cân bằng hơn.`,
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
      title: '💰 Cảnh báo số dư thấp',
      message: `Số dư của bạn đang ở mức thấp (${balance.toFixed(2)} xu). Hãy cân nhắc làm thêm nhiệm vụ để kiếm thêm xu.`,
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
          title: '📈 Xu hướng chi tiêu tăng',
          message: `Chi tiêu của bạn đã tăng ${trendChange.toFixed(0)}% so với tuần trước. Hãy theo dõi sát sao các khoản chi phí của mình.`,
          priority: 'medium',
          actionType: 'reduce',
          confidence: 0.85,
        });
      } else if (trendChange < -20) {
        insights.push({
          type: 'insight',
          title: '✅ Xu hướng chi tiêu giảm',
          message: `Tuyệt vời! Chi tiêu của bạn đã giảm ${Math.abs(trendChange).toFixed(0)}% so với tuần trước. Tiếp tục duy trì nhé!`,
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
        title: '💼 Đề xuất ngân sách',
        message: `Hãy cân nhắc đặt ngân sách ở mức ${recommendedBudget.toFixed(2)} xu (70% thu nhập) để duy trì thói quen chi tiêu lành mạnh.`,
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
          title: '🔍 Phát hiện chi tiêu bất thường',
          message: `Bạn có ${largeTransactions.length} giao dịch lớn bất thường. Hãy kiểm tra lại xem chúng có thực sự cần thiết không.`,
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
      title: '💎 Cơ hội tiết kiệm',
      message: `Bạn đã tiết kiệm được ${netAmount.toFixed(2)} xu trong ${pName} này. Hãy cân nhắc tiết kiệm cho các khoản mua sắm lớn hơn.`,
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
        title: '🛒 Chi tiêu Mua sắm cao',
        message: `Mua sắm chiếm ${categoryPercentage.toFixed(0)}% tổng chi tiêu của bạn. Hãy cân nhắc xem tất cả các khoản mua này có thực sự cần thiết không.`,
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
        title: '🌟 Tỷ lệ tiết kiệm xuất sắc',
        message: `Bạn đang tiết kiệm được ${((1 - earningSpendingRatio) * 100).toFixed(0)}% thu nhập. Kỷ luật tài chính quá tuyệt vời!`,
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















