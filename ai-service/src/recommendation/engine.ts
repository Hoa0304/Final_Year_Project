/**
 * AI Recommendation Engine
 * 
 * This module provides recommendation algorithms for spending and investing.
 * Uses rule-based logic that can be extended with machine learning models.
 */

interface SpendingRecommendationInput {
  userId: string;
  balance: number;
  recentTransactions: Array<{
    type: string;
    amount: number;
    description?: string;
    created_at: string;
  }>;
  availableProducts: Array<{
    id: string;
    name: string;
    price: number;
    category?: string;
  }>;
}

interface Recommendation {
  title: string;
  description: string;
  actionType: 'product' | 'task';
  actionId?: string;
  confidence: number;
}

interface CategorizeTransactionInput {
  description: string;
  amount: number;
  productCategory?: string;
  productName?: string;
  userHistory?: Array<{
    label: string;
    count: number;
  }>;
}

interface CategorizeTransactionOutput {
  label: string;
  confidence: number;
}

/**
 * Generate spending recommendations based on user behavior and balance
 * 
 * Algorithm:
 * 1. Analyze spending patterns from transaction history
 * 2. Recommend products within budget (balance * 0.3)
 * 3. Suggest products from categories user hasn't explored
 * 4. Recommend popular/trending products
 */
export function getSpendingRecommendations(input: SpendingRecommendationInput): Recommendation[] {
  const { balance, recentTransactions, availableProducts } = input;
  const recommendations: Recommendation[] = [];

  // Budget constraint: recommend products within 30% of balance
  const maxRecommendationPrice = balance * 0.3;

  // Analyze spending patterns
  const spendingByCategory = new Map<string, number>();
  const recentSpending = recentTransactions
    .filter(t => t.type === 'spend')
    .slice(0, 10);

  // Get categories from product names/descriptions (simplified)
  const categoryMap: { [key: string]: string } = {
    'laptop': 'Electronics',
    'phone': 'Electronics',
    'headphone': 'Electronics',
    'watch': 'Accessories',
    'book': 'Education'
  };

  // Filter affordable products
  const affordableProducts = availableProducts.filter(p => p.price <= maxRecommendationPrice && p.price > 0);

  // Recommendation 1: Products within budget
  if (affordableProducts.length > 0) {
    // Sort by price (ascending) to recommend cheaper options first
    const sortedProducts = [...affordableProducts].sort((a, b) => a.price - b.price);
    const recommendedProduct = sortedProducts[0];

    recommendations.push({
      title: `Affordable Product: ${recommendedProduct.name}`,
      description: `This product fits your budget (${recommendedProduct.price} coins). Great value for your virtual currency!`,
      actionType: 'product',
      actionId: recommendedProduct.id,
      confidence: 0.8
    });
  }

  // Recommendation 2: Popular products (mid-range price)
  if (affordableProducts.length > 1) {
    const midRangeProducts = affordableProducts.filter(p => 
      p.price >= balance * 0.1 && p.price <= balance * 0.2
    );
    
    if (midRangeProducts.length > 0) {
      const popularProduct = midRangeProducts[Math.floor(Math.random() * midRangeProducts.length)];
      recommendations.push({
        title: `Popular Choice: ${popularProduct.name}`,
        description: `A popular product that many users enjoy. Price: ${popularProduct.price} coins.`,
        actionType: 'product',
        actionId: popularProduct.id,
        confidence: 0.7
      });
    }
  }

  // Recommendation 3: Diversify spending (different category)
  if (recentSpending.length > 0 && affordableProducts.length > 0) {
    const recentCategories = new Set(
      recentSpending
        .map(t => {
          const desc = t.description?.toLowerCase() || '';
          for (const [key, category] of Object.entries(categoryMap)) {
            if (desc.includes(key)) return category;
          }
          return null;
        })
        .filter((c): c is string => c !== null)
    );

    // Find products from different categories
    const diverseProducts = affordableProducts.filter(p => {
      const productCategory = categoryMap[p.name.toLowerCase()] || p.category || 'Other';
      return !recentCategories.has(productCategory);
    });

    if (diverseProducts.length > 0) {
      const diverseProduct = diverseProducts[0];
      recommendations.push({
        title: `Try Something New: ${diverseProduct.name}`,
        description: `Explore a different category! This product offers variety in your spending.`,
        actionType: 'product',
        actionId: diverseProduct.id,
        confidence: 0.65
      });
    }
  }

  // Recommendation 4: Save for bigger purchase
  if (balance < 100 && affordableProducts.some(p => p.price > balance)) {
    const expensiveProducts = affordableProducts.filter(p => p.price > balance * 0.5);
    if (expensiveProducts.length > 0) {
      const targetProduct = expensiveProducts[0];
      const needed = targetProduct.price - balance;
      recommendations.push({
        title: `Save for ${targetProduct.name}`,
        description: `You're close! Save ${needed.toFixed(2)} more coins to afford this product.`,
        actionType: 'product',
        actionId: targetProduct.id,
        confidence: 0.6
      });
    }
  }



  // Sort by confidence and return top 5
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}



/**
 * Categorize a transaction using AI/ML logic
 * 
 * Algorithm:
 * 1. Use product category if available (highest confidence)
 * 2. Analyze description keywords
 * 3. Consider user's historical labeling patterns
 * 4. Fallback to 'other' category
 */
export function categorizeTransaction(input: CategorizeTransactionInput): CategorizeTransactionOutput {
  const { description, productCategory, productName, userHistory } = input;
  
  // Highest confidence: use product category directly
  if (productCategory) {
    return {
      label: productCategory.toLowerCase(),
      confidence: 0.9
    };
  }

  // Keyword-based categorization from description
  const desc = (description || '').toLowerCase();
  const name = (productName || '').toLowerCase();
  const combined = `${desc} ${name}`;

  // Category mapping with keywords
  const categoryKeywords: { [key: string]: string[] } = {
    'electronics': ['laptop', 'phone', 'smartphone', 'headphone', 'earphone', 'tablet', 'computer', 'electronic', 'device', 'gadget'],
    'groceries': ['food', 'grocery', 'restaurant', 'meal', 'snack', 'beverage', 'drink', 'coffee', 'tea'],
    'entertainment': ['game', 'movie', 'music', 'concert', 'ticket', 'streaming', 'subscription', 'netflix', 'spotify'],
    'education': ['book', 'course', 'education', 'learning', 'tutorial', 'class', 'school', 'university'],
    'bills': ['bill', 'utility', 'electricity', 'water', 'internet', 'phone bill', 'subscription', 'monthly'],
    'investment': ['stock', 'share', 'investment', 'portfolio', 'trade', 'buy stock', 'sell stock'],
    'clothing': ['shirt', 'pants', 'dress', 'shoes', 'clothing', 'apparel', 'fashion', 'wear'],
    'health': ['medicine', 'pharmacy', 'health', 'medical', 'doctor', 'hospital', 'vitamin'],
    'transport': ['taxi', 'uber', 'bus', 'train', 'transport', 'gas', 'fuel', 'parking'],
    'other': []
  };

  // Find matching category
  let bestMatch = { label: 'other', confidence: 0.3, matchCount: 0 };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matchCount = keywords.filter(keyword => 
      combined.includes(keyword)
    ).length;
    
    if (matchCount > bestMatch.matchCount) {
      bestMatch = {
        label: category,
        confidence: Math.min(0.3 + (matchCount * 0.15), 0.85),
        matchCount
      };
    }
  }

  // Boost confidence if user has history of this label
  if (userHistory && bestMatch.label !== 'other') {
    const userLabelCount = userHistory.find(h => h.label === bestMatch.label)?.count || 0;
    if (userLabelCount > 0) {
      bestMatch.confidence = Math.min(bestMatch.confidence + (userLabelCount * 0.05), 0.95);
    }
  }

  return {
    label: bestMatch.label,
    confidence: bestMatch.confidence
  };
}
