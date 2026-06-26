/**
 * Công cụ đề xuất AI
 * 
 * Mô-đun này cung cấp các thuật toán đề xuất cho chi tiêu và đầu tư.
 * Sử dụng logic dựa trên quy tắc có thể được mở rộng với các mô hình học máy.
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
 * Đưa ra đề xuất chi tiêu dựa trên hành vi người dùng và số dư
 * 
 * Thuật toán:
 * 1. Phân tích các mẫu chi tiêu từ lịch sử giao dịch
 * 2. Đề xuất các sản phẩm trong phạm vi ngân sách (số dư * 0.3)
 * 3. Đề xuất sản phẩm từ các danh mục người dùng chưa khám phá
 * 4. Đề xuất các sản phẩm phổ biến/đang thịnh hành
 */
export function getSpendingRecommendations(input: SpendingRecommendationInput): Recommendation[] {
  const { balance, recentTransactions, availableProducts } = input;
  const recommendations: Recommendation[] = [];

  // Ràng buộc ngân sách: đề xuất sản phẩm trong phạm vi 30% số dư
  const maxRecommendationPrice = balance * 0.3;

  // Phân tích các mẫu chi tiêu
  const spendingByCategory = new Map<string, number>();
  const recentSpending = recentTransactions
    .filter(t => t.type === 'spend')
    .slice(0, 10);

  // Lấy các danh mục từ tên/mô tả sản phẩm (đơn giản hóa)
  const categoryMap: { [key: string]: string } = {
    'laptop': 'Electronics',
    'phone': 'Electronics',
    'headphone': 'Electronics',
    'watch': 'Accessories',
    'book': 'Education'
  };

  // Lọc các sản phẩm giá cả phải chăng
  const affordableProducts = availableProducts.filter(p => p.price <= maxRecommendationPrice && p.price > 0);

  // Đề xuất 1: Sản phẩm trong phạm vi ngân sách
  if (affordableProducts.length > 0) {
    // Sắp xếp theo giá (tăng dần) để đề xuất các tùy chọn rẻ hơn trước
    const sortedProducts = [...affordableProducts].sort((a, b) => a.price - b.price);
    const recommendedProduct = sortedProducts[0];

    recommendations.push({
      title: `Sản phẩm vừa túi tiền: ${recommendedProduct.name}`,
      description: `Sản phẩm này phù hợp với ngân sách của bạn (${recommendedProduct.price} xu). Rất đáng để trải nghiệm!`,
      actionType: 'product',
      actionId: recommendedProduct.id,
      confidence: 0.8
    });
  }

  // Đề xuất 2: Sản phẩm phổ biến (giá tầm trung)
  if (affordableProducts.length > 1) {
    const midRangeProducts = affordableProducts.filter(p => 
      p.price >= balance * 0.1 && p.price <= balance * 0.2
    );
    
    if (midRangeProducts.length > 0) {
      const popularProduct = midRangeProducts[Math.floor(Math.random() * midRangeProducts.length)];
      recommendations.push({
        title: `Lựa chọn phổ biến: ${popularProduct.name}`,
        description: `Sản phẩm được nhiều người yêu thích. Giá: ${popularProduct.price} xu.`,
        actionType: 'product',
        actionId: popularProduct.id,
        confidence: 0.7
      });
    }
  }

  // Đề xuất 3: Đa dạng hóa chi tiêu (danh mục khác)
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

    // Tìm sản phẩm từ các danh mục khác nhau
    const diverseProducts = affordableProducts.filter(p => {
      const productCategory = categoryMap[p.name.toLowerCase()] || p.category || 'Other';
      return !recentCategories.has(productCategory);
    });

    if (diverseProducts.length > 0) {
      const diverseProduct = diverseProducts[0];
      recommendations.push({
        title: `Thử nghiệm mới: ${diverseProduct.name}`,
        description: `Khám phá một danh mục mới! Sản phẩm này mang lại sự đa dạng cho chi tiêu của bạn.`,
        actionType: 'product',
        actionId: diverseProduct.id,
        confidence: 0.65
      });
    }
  }

  // Đề xuất 4: Tiết kiệm cho việc mua sắm lớn hơn
  if (balance < 100 && affordableProducts.some(p => p.price > balance)) {
    const expensiveProducts = affordableProducts.filter(p => p.price > balance * 0.5);
    if (expensiveProducts.length > 0) {
      const targetProduct = expensiveProducts[0];
      const needed = targetProduct.price - balance;
      recommendations.push({
        title: `Tiết kiệm mua ${targetProduct.name}`,
        description: `Sắp đủ rồi! Tiết kiệm thêm ${needed.toFixed(2)} xu nữa để có thể mua sản phẩm này.`,
        actionType: 'product',
        actionId: targetProduct.id,
        confidence: 0.6
      });
    }
  }



  // Sắp xếp theo độ tin cậy và trả về top 5
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}



/**
 * Phân loại một giao dịch bằng logic AI/ML
 * 
 * Thuật toán:
 * 1. Sử dụng danh mục sản phẩm nếu có (độ tin cậy cao nhất)
 * 2. Phân tích từ khóa mô tả
 * 3. Xem xét các mẫu ghi nhãn lịch sử của người dùng
 * 4. Dự phòng sang danh mục 'khác'
 */
export function categorizeTransaction(input: CategorizeTransactionInput): CategorizeTransactionOutput {
  const { description, productCategory, productName, userHistory } = input;
  
  // Độ tin cậy cao nhất: sử dụng trực tiếp danh mục sản phẩm
  if (productCategory) {
    return {
      label: productCategory.toLowerCase(),
      confidence: 0.9
    };
  }

  // Phân loại dựa trên từ khóa từ mô tả
  const desc = (description || '').toLowerCase();
  const name = (productName || '').toLowerCase();
  const combined = `${desc} ${name}`;

  // Ánh xạ danh mục với các từ khóa
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

  // Tìm danh mục khớp
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

  // Tăng độ tin cậy nếu người dùng có lịch sử với nhãn này
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
