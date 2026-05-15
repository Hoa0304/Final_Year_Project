# AI System Integration Guide

## Tổng quan

Hệ thống AI trong ứng dụng bao gồm:
1. **Rule-Based AI**: Gợi ý dựa trên quy tắc (balance, transactions, products)
2. **ML Models**: Machine Learning models cho product recommendations
3. **Expense Insights**: Phân tích chi tiêu thông minh
4. **Item Suggestions**: Gợi ý sản phẩm dựa trên transaction labels

## Kiến trúc

```
Frontend (React Native)
    ↓
Backend API (Express)
    ↓
AI Service (Port 3003)
    ├── Rule-Based Engine
    ├── ML Models (Content-Based, Collaborative, Hybrid)
    └── Expense Insights Engine
```

## 1. ML Models (Machine Learning)

### Models đã được train:
- **Content-Based Filtering**: Dựa trên đặc tính sản phẩm (category, price, description)
- **Collaborative Filtering**: Dựa trên hành vi người dùng tương tự
- **Hybrid Recommender**: Kết hợp cả hai approaches

### Training Models:

```bash
cd ai-service
npm run train          # Train tất cả models
npm run train:content  # Chỉ train content-based
npm run train:hybrid   # Chỉ train hybrid
```

### API Endpoints:

#### Backend (Proxy):
- `GET /api/recommendations/ml?modelType=hybrid&topN=10`
  - `modelType`: `hybrid` | `content-based` | `collaborative`
  - `topN`: Số lượng recommendations (default: 10)

#### AI Service (Direct):
- `POST /ml/recommendations`
  ```json
  {
    "userId": "user-id",
    "modelType": "hybrid",
    "topN": 10
  }
  ```

### Tích hợp vào Frontend:

```typescript
import { getMLRecommendations } from '../../services/recommendation.service';

// Fetch ML recommendations
const { data: mlRecommendations } = useQuery({
  queryKey: ['mlRecommendations', userId],
  queryFn: () => getMLRecommendations('hybrid', 10),
});

// mlRecommendations.recommendations là array of:
// {
//   productId: string,
//   score: number,        // 0-1
//   reason: string,
//   model: 'hybrid' | 'content-based' | 'collaborative'
// }
```

### Ứng dụng:
- **MarketplaceScreen**: Hiển thị section "Recommended for You" với ML recommendations
- Tự động refresh mỗi 5 phút
- Fallback về rule-based nếu ML models không available

## 2. Rule-Based Recommendations

### API Endpoints:

#### Spending Recommendations:
- `GET /api/recommendations/spending`
  - Gợi ý sản phẩm, games, tasks dựa trên balance và transaction history

#### Investing Recommendations:
- `GET /api/recommendations/investing`
  - Gợi ý stocks dựa trên portfolio và market trends

### Tích hợp vào Frontend:

```typescript
import { getSpendingRecommendations, getInvestingRecommendations } from '../../services/recommendation.service';

// Dashboard Screen
const { data: spendingRecs } = useQuery({
  queryKey: ['spendingRecommendations'],
  queryFn: getSpendingRecommendations,
  refetchInterval: 60000, // Refresh every 60 seconds
});
```

### Ứng dụng:
- **DashboardScreen**: Hiển thị spending và investing recommendations
- Tự động refresh mỗi 60 giây

## 3. Expense Insights

### API Endpoints:

- `GET /api/transactions/expense-insights?period=month`
  - `period`: `day` | `week` | `month` | `year`

### Response:
```json
{
  "insights": [
    {
      "type": "warning" | "alert" | "suggestion" | "tip",
      "title": "⚠️ High Spending Rate",
      "message": "...",
      "priority": "high" | "medium" | "low",
      "confidence": 0.9,
      "actionType": "set_budget" | "view_transactions" | "create_savings_goal"
    }
  ],
  "prediction": {
    "predictedAmount": 5000,
    "confidence": 0.8,
    "trend": "increasing" | "decreasing" | "stable"
  }
}
```

### Tích hợp vào Frontend:

```typescript
import { getExpenseInsights } from '../../services/transaction-label.service';

// Expense Management Screen
const { data: insightsData } = useQuery({
  queryKey: ['expenseInsights', period],
  queryFn: () => getExpenseInsights(period),
  refetchInterval: 60000,
});
```

### Ứng dụng:
- **ExpenseManagementScreen**: Hiển thị AI insights và predictions
- Actionable insights với buttons để set budget, create savings goal, etc.

## 4. Item Suggestions

### API Endpoints:

- `GET /api/suggestions/items`
  - Gợi ý sản phẩm dựa trên transaction labels

### Tích hợp vào Frontend:

```typescript
import { getItemSuggestions } from '../../services/ai-suggestions.service';

// Dashboard Screen
const { data: itemSuggestions } = useQuery({
  queryKey: ['itemSuggestions', userId],
  queryFn: () => getItemSuggestions(),
  refetchInterval: 60000,
});
```

### Ứng dụng:
- **DashboardScreen**: Hiển thị "You might like" suggestions

## 5. Model Storage & Versioning

### Location:
- Models được lưu trong `ai-service/models/`
- Format: `{modelType}_{version}_{timestamp}.json`
- Latest: `{modelType}_latest.json`

### Loading:
- Models tự động load khi AI service khởi động
- Fallback về rule-based nếu không có models

## 6. Training Data

### Endpoints để fetch training data:
- `GET /api/products?limit=1000` - Tất cả products
- `GET /api/purchase-history/all` - Tất cả purchases (admin only)
- `GET /api/products/ratings/all` - Tất cả ratings (admin only)
- `GET /api/users?limit=1000` - Tất cả users

### Training với real data:
1. Đảm bảo backend đang chạy
2. Có dữ liệu trong database
3. Set `ADMIN_TOKEN` trong `.env` của ai-service (nếu cần)
4. Run: `npm run train`

## 7. Configuration

### Environment Variables:

#### Backend (.env):
```env
AI_SERVICE_URL=http://localhost:3003
```

#### AI Service (.env):
```env
PORT=3003
BACKEND_URL=http://localhost:3001
ADMIN_TOKEN=your-admin-token  # Optional, for training
```

## 8. Best Practices

1. **Caching**: Recommendations được cache trong database
2. **Fallback**: Luôn có fallback về rule-based nếu ML fails
3. **Refresh Intervals**: 
   - ML recommendations: 5 phút
   - Rule-based: 60 giây
   - Expense insights: 60 giây
4. **Error Handling**: Graceful degradation khi AI service unavailable

## 9. Monitoring

### Logs:
- AI service logs model loading status
- Backend logs AI service calls và errors
- Frontend logs recommendation fetches

### Metrics:
- Model version trong recommendations response
- Confidence scores
- Source (ml-model vs rule-based)

## 10. Future Enhancements

1. **Real-time Training**: Auto-retrain khi có data mới
2. **A/B Testing**: So sánh performance của các models
3. **User Feedback**: Collect feedback để improve models
4. **Deep Learning**: Integrate neural networks cho better accuracy















