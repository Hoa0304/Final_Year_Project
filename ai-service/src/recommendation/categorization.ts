/**
 * Công cụ phân loại giao dịch
 * 
 * Mô-đun này cung cấp tính năng phân loại giao dịch dựa trên AI.
 * Sử dụng logic dựa trên quy tắc có thể được mở rộng với các mô hình học máy.
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

// Ánh xạ từ khóa danh mục (tiếng Anh và tiếng Việt)
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
 * Phân loại một giao dịch dựa trên nội dung của nó và lịch sử người dùng
 */
export function categorizeTransaction(
  transaction: Transaction,
  userHistory: UserHistory[] = []
): CategorizationResult {
  const description = (transaction.description || '').toLowerCase();
  const referenceType = (transaction.reference_type || '').toLowerCase();
  const transactionType = transaction.type.toLowerCase();

  // Phân tích các danh mục lịch sử của người dùng cho các giao dịch tương tự
  const similarTransactions = userHistory.filter(t => {
    const tDesc = (t.description || '').toLowerCase();
    const tType = t.type.toLowerCase();
    
    // Kiểm tra các từ khóa hoặc loại giao dịch tương tự
    return (
      (tDesc && description && (tDesc.includes(description.split(' ')[0]) || description.includes(tDesc.split(' ')[0]))) ||
      tType === transactionType
    );
  });

  // Lấy danh mục phổ biến nhất từ các giao dịch tương tự
  const categoryFrequency: { [key: string]: number } = {};
  similarTransactions.forEach(t => {
    if (t.category) {
      categoryFrequency[t.category] = (categoryFrequency[t.category] || 0) + 1;
    }
  });

  const mostCommonCategory = Object.entries(categoryFrequency)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  // Chấm điểm các danh mục dựa trên từ khóa
  const categoryScores: { [key: string]: number } = {};

  // Kiểm tra từ khóa trong mô tả
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (description.includes(keyword)) {
        categoryScores[category] = (categoryScores[category] || 0) + 2;
      }
    });
  });

  // Kiểm tra reference_type (loại tham chiếu)
  if (referenceType === 'order') {
    if (transaction.productCategory) {
      const cat = transaction.productCategory.toLowerCase();
      let matchedMaster = Object.keys(categoryKeywords).find(k => k.toLowerCase() === cat);
      
      if (!matchedMaster) {
        // Tìm kiếm trong các từ khóa nếu tên danh mục chính xác không khớp
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

  // Kiểm tra loại giao dịch
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

  // Tăng điểm nếu khớp với mẫu lịch sử của người dùng
  if (mostCommonCategory && categoryScores[mostCommonCategory]) {
    categoryScores[mostCommonCategory] += 2;
  }

  // Tìm danh mục có điểm cao nhất
  const sortedCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1]);

  let category = 'Other';
  let confidence = 0.5;

  if (sortedCategories.length > 0 && sortedCategories[0][1] > 0) {
    category = sortedCategories[0][0];
    const maxScore = sortedCategories[0][1];
    const secondScore = sortedCategories[1]?.[1] || 0;
    
    // Tính toán độ tin cậy dựa trên sự khác biệt điểm số
    if (maxScore >= 5) {
      confidence = Math.min(0.95, 0.7 + (maxScore - secondScore) * 0.05);
    } else if (maxScore >= 3) {
      confidence = 0.65;
    } else {
      confidence = 0.55;
    }

    // Tăng độ tin cậy nếu khớp với lịch sử người dùng
    if (category === mostCommonCategory && similarTransactions.length >= 2) {
      confidence = Math.min(0.95, confidence + 0.1);
    }
  } else if (mostCommonCategory) {
    // Dự phòng sang danh mục phổ biến nhất của người dùng
    category = mostCommonCategory;
    confidence = 0.6;
  }

  return { category, confidence };
}

























