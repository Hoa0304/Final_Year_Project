/**
 * Công cụ gợi ý sản phẩm
 * 
 * Mô-đun này cung cấp gợi ý sản phẩm dựa trên AI dựa trên nhãn giao dịch
 * và lịch sử mua sắm.
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
 * Đưa ra gợi ý sản phẩm dựa trên nhãn giao dịch và lịch sử mua sắm
 */
export function getItemSuggestions(input: SuggestionsInput): Suggestion[] {
  const { transactions, purchaseHistory, availableProducts } = input;
  const suggestions: Suggestion[] = [];

  // Phân tích các danh mục giao dịch
  const categoryFrequency: { [key: string]: number } = {};
  const categorySpending: { [key: string]: number } = {};

  transactions.forEach(t => {
    if (t.category && t.type === 'spend') {
      categoryFrequency[t.category] = (categoryFrequency[t.category] || 0) + 1;
      categorySpending[t.category] = (categorySpending[t.category] || 0) + parseFloat(t.amount.toString());
    }
  });

  // Lấy các danh mục hàng đầu
  const topCategories = Object.entries(categoryFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  // Lấy ID sản phẩm đã mua gần đây để tránh gợi ý chúng
  const recentProductIds = new Set(
    purchaseHistory
      .slice(0, 10)
      .map(p => p.product_id)
  );

  // Lọc các sản phẩm có sẵn (loại trừ những sản phẩm mua gần đây)
  const candidateProducts = availableProducts.filter(p => !recentProductIds.has(p.id));

  // Gợi ý 1: Sản phẩm từ các danh mục chi tiêu cao nhất
  topCategories.forEach(category => {
    const categoryProducts = candidateProducts.filter(p => p.category === category);
    if (categoryProducts.length > 0) {
      // Sắp xếp theo giá (ưu tiên tầm trung)
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
        reason: `Dựa trên lịch sử mua ${category}`,
        confidence: 0.75 + (categoryFrequency[category] / transactions.length) * 0.15
      });
    }
  });

  // Gợi ý 2: Sản phẩm tương tự các mặt hàng thường xuyên được mua
  if (purchaseHistory.length > 0) {
    // Lấy danh mục được mua thường xuyên nhất
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
            reason: `Tương tự các sản phẩm ${mostPurchasedCategory} bạn đã mua`,
            confidence: 0.7
          });
        }
      });
    }
  }

  // Gợi ý 3: Sản phẩm phổ biến trong phạm vi giá của người dùng
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
        .sort((a, b) => b.price - a.price)[0]; // Ưu tiên các mặt hàng có giá cao hơn trong phạm vi

      if (!suggestions.find(s => s.productId === popularProduct.id)) {
        suggestions.push({
          productId: popularProduct.id,
          productName: popularProduct.name,
          productPrice: popularProduct.price,
          productCategory: popularProduct.category,
          productImageUrl: popularProduct.image_url,
          reason: `Phù hợp mức chi tiêu (TB ${avgSpending.toFixed(0)} xu)`,
          confidence: 0.65
        });
      }
    }
  }

  // Gợi ý 4: Khám phá danh mục mới (danh mục người dùng chưa từng mua)
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
        reason: `Khám phá danh mục ${product.category}`,
        confidence: 0.6
      });
    }
  });

  // Sắp xếp theo độ tin cậy và trả về các gợi ý hàng đầu
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

























