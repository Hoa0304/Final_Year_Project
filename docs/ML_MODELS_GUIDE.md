# ML Models Guide - HMall Recommendation System

## 📚 Overview

Hệ thống đã được tích hợp đầy đủ các ML models cho recommendation:

1. **Content-Based Filtering** - Dựa trên đặc điểm sản phẩm
2. **Collaborative Filtering** - Dựa trên hành vi người dùng tương tự
3. **Hybrid Recommender** - Kết hợp cả hai (recommended)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-service
npm install
```

### 2. Train Models

```bash
# Train tất cả models
npm run train

# Train từng model riêng
npm run train:content          # Content-Based only
npm run train:collaborative    # Collaborative only
npm run train:hybrid          # Hybrid (recommended)
```

### 3. Start AI Service

```bash
npm run dev
```

Models sẽ tự động load khi service khởi động.

## 📊 Models Explained

### Content-Based Filtering

**Cách hoạt động:**
- Phân tích đặc điểm sản phẩm (category, price, description, rating)
- Sử dụng TF-IDF để vectorize text
- Tính similarity giữa sản phẩm user đã mua và sản phẩm khác
- Recommend sản phẩm tương tự

**Ưu điểm:**
- ✅ Không cần dữ liệu từ users khác (no cold start cho products)
- ✅ Explainable (có thể giải thích tại sao recommend)
- ✅ Tốt cho niche products

**Nhược điểm:**
- ❌ Không personalization sâu
- ❌ Không phát hiện được unexpected preferences

### Collaborative Filtering

**Cách hoạt động:**
- Phân tích hành vi của users tương tự
- Xây dựng user-item matrix và item-item matrix
- Recommend dựa trên "users like you also liked"

**Có 2 loại:**

1. **User-Based CF**
   - Tìm users tương tự
   - Recommend products mà similar users đã mua

2. **Item-Based CF**
   - Tìm products tương tự
   - Recommend products tương tự với products user đã mua

**Ưu điểm:**
- ✅ Personalization tốt
- ✅ Phát hiện được unexpected preferences
- ✅ Tốt cho popular products

**Nhược điểm:**
- ❌ Cold start problem (user mới, product mới)
- ❌ Cần nhiều dữ liệu

### Hybrid Recommender

**Cách hoạt động:**
- Kết hợp Content-Based (40%) và Collaborative (60%)
- Weighted combination của scores
- Fallback mechanism khi một model không có data

**Ưu điểm:**
- ✅ Tốt nhất - kết hợp ưu điểm của cả hai
- ✅ Giải quyết cold start problem
- ✅ Personalization tốt + explainable

## 🔧 API Endpoints

### Get ML Recommendations

```http
POST /ml/recommendations
Content-Type: application/json

{
  "userId": "user-id",
  "modelType": "hybrid",  // "hybrid" | "content-based" | "collaborative"
  "topN": 10
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "productId": "product-id",
      "score": 0.85,
      "reason": "Combined: product similarity + user preferences",
      "model": "hybrid"
    }
  ],
  "source": "ml-model",
  "model": "hybrid",
  "count": 10
}
```

### Train Models

```http
POST /ml/train
Content-Type: application/json

{
  "modelType": "all"  // "all" | "content-based" | "collaborative" | "hybrid"
}
```

### List Models

```http
GET /ml/models
```

### Get Model Info

```http
GET /ml/models/hybrid
```

## 📁 Model Storage

Models được lưu trong `ai-service/models/`:

```
models/
├── hybrid_1.1234567890_2024-01-12T10-30-00-000Z.json
├── hybrid_latest.json
├── content-based_1.1234567890_2024-01-12T10-30-00-000Z.json
├── content-based_latest.json
├── collaborative_1.1234567890_2024-01-12T10-30-00-000Z.json
└── collaborative_latest.json
```

## 🔄 Training Workflow

1. **Fetch Data** từ backend API
2. **Preprocess** data (extract features, build matrices)
3. **Train** models
4. **Save** models to disk
5. **Load** models when service starts

## 🎯 Usage in Frontend

Update recommendation service để sử dụng ML models:

```typescript
// frontend/src/services/recommendation.service.ts

export async function getMLRecommendations(
  userId: string,
  modelType: 'hybrid' | 'content-based' | 'collaborative' = 'hybrid',
  topN: number = 10
) {
  const response = await api.post(`${AI_SERVICE_URL}/ml/recommendations`, {
    userId,
    modelType,
    topN,
  });
  return response.data;
}
```

## 📈 Performance Tips

1. **Train regularly**: Retrain models khi có đủ data mới
2. **Use Hybrid**: Hybrid model thường cho kết quả tốt nhất
3. **Cache recommendations**: Cache recommendations cho users để giảm computation
4. **Background training**: Train models trong background job, không block API

## 🐛 Troubleshooting

### Models không load được
- Kiểm tra `models/` directory tồn tại
- Chạy `npm run train` để tạo models
- Kiểm tra logs khi service khởi động

### Recommendations trống
- Kiểm tra có đủ data (products, purchases, ratings)
- Kiểm tra userId có đúng không
- Fallback về rule-based nếu ML models chưa sẵn sàng

### Training fails
- Kiểm tra backend API có chạy không
- Kiểm tra có đủ data để train
- Xem logs để biết lỗi cụ thể

## 🔮 Future Enhancements

- [ ] Matrix Factorization (SVD, NMF)
- [ ] Deep Learning models (Neural Collaborative Filtering)
- [ ] Real-time model updates
- [ ] A/B testing framework
- [ ] Model performance metrics
- [ ] AutoML for hyperparameter tuning
















