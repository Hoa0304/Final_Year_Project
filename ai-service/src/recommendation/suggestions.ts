/**
 * Item Suggestion Engine
 * 
 * This module provides AI-based item suggestions based on transaction labels
 * and purchase history.
 */

interface Transaction {
  type: string;
  amount: number;
  description?: string;
  category?: string;
}

interface Purchase {
  product_id: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
}

interface Suggestion {
  productId: string;
  productName: string;
  productPrice: number;
  productCategory?: string;
  productImageUrl?: string;
  reason: string;
  confidence: number;
}

interface SuggestionsInput {
  userId: string;
  transactions: Transaction[];
  purchaseHistory: Purchase[];
  availableProducts: Product[];
}

/**
 * Generate item suggestions based on transaction labels and purchase history
 */
export function getItemSuggestions(input: SuggestionsInput): Suggestion[] {
  const { transactions, purchaseHistory, availableProducts } = input;
  const suggestions: Suggestion[] = [];

  // Analyze transaction categories
  const categoryFrequency: { [key: string]: number } = {};
  const categorySpending: { [key: string]: number } = {};

  transactions.forEach(t => {
    if (t.category && t.type === 'spend') {
      categoryFrequency[t.category] = (categoryFrequency[t.category] || 0) + 1;
      categorySpending[t.category] = (categorySpending[t.category] || 0) + parseFloat(t.amount.toString());
    }
  });

  // Get top categories
  const topCategories = Object.entries(categoryFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  // Get recently purchased product IDs to avoid suggesting them
  const recentProductIds = new Set(
    purchaseHistory
      .slice(0, 10)
      .map(p => p.product_id)
  );

  // Filter available products (exclude recently purchased)
  const candidateProducts = availableProducts.filter(p => !recentProductIds.has(p.id));

  // Suggestion 1: Products from top spending categories
  topCategories.forEach(category => {
    const categoryProducts = candidateProducts.filter(p => p.category === category);
    if (categoryProducts.length > 0) {
      // Sort by price (prefer mid-range)
      const sortedProducts = [...categoryProducts].sort((a, b) => {
        const avgSpending = categorySpending[category] / categoryFrequency[category];
        const aDiff = Math.abs(a.price - avgSpending);
        const bDiff = Math.abs(b.price - avgSpending);
        return aDiff - bDiff;
      });

      const product = sortedProducts[0];
      suggestions.push({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productCategory: product.category,
        productImageUrl: product.image_url,
        reason: `Based on your ${category} purchases`,
        confidence: 0.75 + (categoryFrequency[category] / transactions.length) * 0.15
      });
    }
  });

  // Suggestion 2: Similar products to frequently purchased items
  if (purchaseHistory.length > 0) {
    // Get most frequently purchased category
    const purchaseCategories: { [key: string]: number } = {};
    purchaseHistory.forEach(p => {
      const product = availableProducts.find(ap => ap.id === p.product_id);
      if (product?.category) {
        purchaseCategories[product.category] = (purchaseCategories[product.category] || 0) + 1;
      }
    });

    const mostPurchasedCategory = Object.entries(purchaseCategories)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (mostPurchasedCategory) {
      const similarProducts = candidateProducts
        .filter(p => p.category === mostPurchasedCategory)
        .slice(0, 2);

      similarProducts.forEach(product => {
        if (!suggestions.find(s => s.productId === product.id)) {
          suggestions.push({
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            productCategory: product.category,
            productImageUrl: product.image_url,
            reason: `Similar to your previous ${mostPurchasedCategory} purchases`,
            confidence: 0.7
          });
        }
      });
    }
  }

  // Suggestion 3: Popular products in user's price range
  const avgSpending = transactions
    .filter(t => t.type === 'spend')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) / 
    Math.max(1, transactions.filter(t => t.type === 'spend').length);

  if (avgSpending > 0) {
    const priceRangeProducts = candidateProducts.filter(p => 
      p.price >= avgSpending * 0.5 && p.price <= avgSpending * 2
    );

    if (priceRangeProducts.length > 0) {
      const popularProduct = priceRangeProducts
        .sort((a, b) => b.price - a.price)[0]; // Prefer higher priced items in range

      if (!suggestions.find(s => s.productId === popularProduct.id)) {
        suggestions.push({
          productId: popularProduct.id,
          productName: popularProduct.name,
          productPrice: popularProduct.price,
          productCategory: popularProduct.category,
          productImageUrl: popularProduct.image_url,
          reason: `Matches your spending pattern (${avgSpending.toFixed(0)} coins average)`,
          confidence: 0.65
        });
      }
    }
  }

  // Suggestion 4: Explore new categories (categories user hasn't purchased from)
  const purchasedCategories = new Set(
    purchaseHistory
      .map(p => {
        const product = availableProducts.find(ap => ap.id === p.product_id);
        return product?.category;
      })
      .filter((c): c is string => !!c)
  );

  const unexploredCategories = candidateProducts
    .filter(p => p.category && !purchasedCategories.has(p.category))
    .reduce((acc, p) => {
      if (!acc.find(item => item.category === p.category)) {
        acc.push(p);
      }
      return acc;
    }, [] as Product[])
    .slice(0, 2);

  unexploredCategories.forEach(product => {
    if (!suggestions.find(s => s.productId === product.id)) {
      suggestions.push({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productCategory: product.category,
        productImageUrl: product.image_url,
        reason: `Explore ${product.category} category`,
        confidence: 0.6
      });
    }
  });

  // Sort by confidence and return top suggestions
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

























