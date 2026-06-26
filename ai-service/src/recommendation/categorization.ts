/**
 * Transaction Categorization Engine
 * 
 * This module provides AI-based categorization for transactions.
 * Uses rule-based logic that can be extended with machine learning models.
 */

interface Transaction {
  type: string;
  amount: number;
  description?: string;
  reference_type?: string;
  productCategory?: string;
  productName?: string;
}

interface UserHistory {
  type: string;
  amount: number;
  description?: string;
  category?: string;
}

interface CategorizationResult {
  category: string;
  confidence: number;
}

// Category keywords mapping (English & Vietnamese)
const categoryKeywords: { [key: string]: string[] } = {
  'Shopping': ['product', 'purchase', 'buy', 'order', 'item', 'cart', 'shop', 'store', 'mua sắm', 'quần áo', 'thời trang', 'giày dép', 'mỹ phẩm', 'đồ gia dụng'],
  'Electronics': ['laptop', 'phone', 'computer', 'tablet', 'headphone', 'earphone', 'speaker', 'camera', 'tv', 'monitor', 'điện tử', 'điện thoại', 'máy tính', 'tai nghe'],
  'Entertainment': ['game', 'play', 'movie', 'music', 'streaming', 'subscription', 'ticket', 'event', 'giải trí', 'phim', 'nhạc', 'vé', 'sự kiện'],
  'Earnings': ['task', 'reward', 'bonus', 'earn', 'win', 'prize', 'completion', 'thu nhập', 'lương', 'thưởng', 'nhiệm vụ'],
  'Investment': ['stock', 'share', 'trade', 'invest', 'portfolio', 'dividend', 'profit', 'loss', 'đầu tư', 'cổ phiếu', 'chứng khoán', 'lợi nhuận'],
  'Food': ['food', 'restaurant', 'meal', 'grocery', 'cafe', 'dining', 'snack', 'drink', 'đồ ăn', 'thức ăn', 'ẩm thực', 'ăn uống', 'cà phê', 'nước uống', 'nhà hàng'],
  'Transportation': ['taxi', 'uber', 'bus', 'train', 'flight', 'gas', 'fuel', 'parking', 'di chuyển', 'đi lại', 'xe cộ', 'xăng', 'vé xe'],
  'Bills': ['bill', 'utility', 'electric', 'water', 'internet', 'phone', 'subscription', 'hóa đơn', 'điện', 'nước', 'mạng'],
  'Reward': ['grant', 'admin', 'bonus', 'gift', 'promotion', 'quà tặng', 'khuyến mãi'],
  'Other': ['khác']
};

/**
 * Categorize a transaction based on its content and user history
 */
export function categorizeTransaction(
  transaction: Transaction,
  userHistory: UserHistory[] = []
): CategorizationResult {
  const description = (transaction.description || '').toLowerCase();
  const referenceType = (transaction.reference_type || '').toLowerCase();
  const transactionType = transaction.type.toLowerCase();

  // Analyze user's historical categories for similar transactions
  const similarTransactions = userHistory.filter(t => {
    const tDesc = (t.description || '').toLowerCase();
    const tType = t.type.toLowerCase();
    
    // Check for similar keywords or transaction types
    return (
      (tDesc && description && (tDesc.includes(description.split(' ')[0]) || description.includes(tDesc.split(' ')[0]))) ||
      tType === transactionType
    );
  });

  // Get most common category from similar transactions
  const categoryFrequency: { [key: string]: number } = {};
  similarTransactions.forEach(t => {
    if (t.category) {
      categoryFrequency[t.category] = (categoryFrequency[t.category] || 0) + 1;
    }
  });

  const mostCommonCategory = Object.entries(categoryFrequency)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  // Score categories based on keywords
  const categoryScores: { [key: string]: number } = {};

  // Check description keywords
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (description.includes(keyword)) {
        categoryScores[category] = (categoryScores[category] || 0) + 2;
      }
    });
  });

  // Check reference_type
  if (referenceType === 'order') {
    if (transaction.productCategory) {
      const cat = transaction.productCategory.toLowerCase();
      let matchedMaster = Object.keys(categoryKeywords).find(k => k.toLowerCase() === cat);
      
      if (!matchedMaster) {
        // Search inside keywords if exact master category name didn't match
        matchedMaster = Object.entries(categoryKeywords).find(([_, keywords]) => 
          keywords.some(kw => cat.includes(kw) || kw.includes(cat))
        )?.[0];
      }

      if (matchedMaster) {
        categoryScores[matchedMaster] = (categoryScores[matchedMaster] || 0) + 10;
      } else {
        categoryScores['Shopping'] = (categoryScores['Shopping'] || 0) + 5;
      }
    } else {
      categoryScores['Shopping'] = (categoryScores['Shopping'] || 0) + 5;
    }
  } else if (referenceType === 'task') {
    categoryScores['Earnings'] = (categoryScores['Earnings'] || 0) + 5;
  } else if (referenceType === 'stock') {
    categoryScores['Investment'] = (categoryScores['Investment'] || 0) + 5;
  } else if (referenceType === 'admin_grant') {
    categoryScores['Reward'] = (categoryScores['Reward'] || 0) + 5;
  }

  // Check transaction type
  switch (transactionType) {
    case 'spend':
      categoryScores['Shopping'] = (categoryScores['Shopping'] || 0) + 3;
      break;
    case 'earn':
    case 'task_reward':
      categoryScores['Earnings'] = (categoryScores['Earnings'] || 0) + 3;
      break;
    case 'stock_profit':
    case 'stock_loss':
      categoryScores['Investment'] = (categoryScores['Investment'] || 0) + 3;
      break;
  }

  // Boost score if it matches user's historical pattern
  if (mostCommonCategory && categoryScores[mostCommonCategory]) {
    categoryScores[mostCommonCategory] += 2;
  }

  // Find category with highest score
  const sortedCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1]);

  let category = 'Other';
  let confidence = 0.5;

  if (sortedCategories.length > 0 && sortedCategories[0][1] > 0) {
    category = sortedCategories[0][0];
    const maxScore = sortedCategories[0][1];
    const secondScore = sortedCategories[1]?.[1] || 0;
    
    // Calculate confidence based on score difference
    if (maxScore >= 5) {
      confidence = Math.min(0.95, 0.7 + (maxScore - secondScore) * 0.05);
    } else if (maxScore >= 3) {
      confidence = 0.65;
    } else {
      confidence = 0.55;
    }

    // Increase confidence if it matches user history
    if (category === mostCommonCategory && similarTransactions.length >= 2) {
      confidence = Math.min(0.95, confidence + 0.1);
    }
  } else if (mostCommonCategory) {
    // Fallback to user's most common category
    category = mostCommonCategory;
    confidence = 0.6;
  }

  return { category, confidence };
}

























