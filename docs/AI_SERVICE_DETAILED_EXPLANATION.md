# Giải Thích Chi Tiết AI Service - HMall

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
3. [Machine Learning Models](#machine-learning-models)
4. [Rule-Based AI Systems](#rule-based-ai-systems)
5. [Quy Trình Training](#quy-trình-training)
6. [Model Storage & Versioning](#model-storage--versioning)
7. [Độ Tin Cậy & Accuracy](#độ-tin-cậy--accuracy)
8. [API Endpoints](#api-endpoints)
9. [Code Examples](#code-examples)
10. [Best Practices](#best-practices)

---

## 🎯 Tổng Quan

AI Service trong dự án HMall là một microservice độc lập (chạy trên port 3003) cung cấp các tính năng AI/ML cho hệ thống:

### Các Chức Năng Chính:

1. **ML-Based Product Recommendations** (Machine Learning)
   - Content-Based Filtering
   - Collaborative Filtering
   - Hybrid Recommender (kết hợp cả hai)

2. **Rule-Based AI Systems** (Không cần training)
   - Expense Insights & Analytics
   - Spending Recommendations
   - Investment Recommendations
   - Transaction Categorization
   - Spending Prediction

### Tại Sao Có 2 Loại AI?

- **ML Models**: Cần training, tốt cho personalization sâu, phát hiện patterns phức tạp
- **Rule-Based**: Không cần training, hoạt động ngay, dễ hiểu và maintain

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐
│   Frontend      │
│  (React Native) │
└────────┬────────┘
         │
         │ HTTP API
         ▼
┌─────────────────┐
│    Backend      │
│   (Express)     │
│   Port: 3001    │
└────────┬────────┘
         │
         │ Proxy/Forward
         ▼
┌─────────────────┐
│   AI Service    │
│   Port: 3003    │
├─────────────────┤
│                 │
│  ┌───────────┐  │
│  │ ML Models │  │
│  │ - Content │  │
│  │ - Collab  │  │
│  │ - Hybrid  │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │ Rule-Based│  │
│  │ - Insights│  │
│  │ - Engine  │  │
│  │ - Predict │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │ Storage   │  │
│  │ - Models  │  │
│  │ - Version │  │
│  └───────────┘  │
└─────────────────┘
```

### Cấu Trúc Thư Mục:

```
ai-service/
├── src/
│   ├── index.ts                    # Entry point, Express server
│   ├── ml/                         # Machine Learning Models
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── content-based.ts        # Content-Based Filtering
│   │   ├── collaborative-filtering.ts  # Collaborative Filtering
│   │   ├── hybrid-recommender.ts   # Hybrid Recommender
│   │   ├── model-storage.ts        # Model persistence
│   │   ├── train.ts                # Training script (full)
│   │   └── train-simple.ts         # Training script (simple)
│   └── recommendation/             # Rule-Based AI
│       ├── engine.ts               # Spending/Investing recommendations
│       ├── categorization.ts       # Transaction categorization
│       ├── expense-insights.ts     # Expense analytics
│       └── suggestions.ts          # Item suggestions
├── models/                         # Trained models storage
│   ├── hybrid_latest.json
│   ├── content-based_latest.json
│   └── collaborative_latest.json
└── package.json
```

---

## 🤖 Machine Learning Models

### 1. Content-Based Filtering

#### Thuật Toán:

**Bước 1: Feature Extraction**
```typescript
// Extract features từ products
features = {
  category: product.category,           // Weight: 0.3
  price: product.price,                 // Weight: 0.2
  description: TF-IDF(text),           // Weight: 0.3
  rating: product.averageRating        // Weight: 0.2
}
```

**Bước 2: TF-IDF Vectorization**
```typescript
// Sử dụng thư viện 'natural' để tính TF-IDF
const tfidf = new natural.TfIdf();
tfidf.addDocument(`${name} ${description} ${category}`);

// Tạo vector cho mỗi product
vector = [term1.tfidf, term2.tfidf, ..., termN.tfidf]
// Normalize vector
normalizedVector = vector / ||vector||
```

**Bước 3: Similarity Calculation**
```typescript
// Cosine Similarity giữa user profile và products
similarity = (userVector · productVector) / (||userVector|| × ||productVector||)

// Feature Similarity (weighted combination)
similarity = 
  categoryMatch * 0.3 +
  priceSimilarity * 0.2 +
  descriptionSimilarity * 0.3 +
  ratingSimilarity * 0.2
```

**Bước 4: Recommendation**
```typescript
// Với mỗi product user chưa mua:
for (candidateProduct in allProducts) {
  score = average(similarity(candidateProduct, userPurchasedProducts))
  recommendations.push({ productId, score })
}

// Sort by score, return top N
```

#### Code Implementation:

```typescript:ai-service/src/ml/content-based.ts
// Extract features từ products
extractFeatures(products: Product[]): Map<string, ContentFeatures> {
  const features = new Map();
  
  products.forEach(product => {
    // Tokenize description
    const tokens = tokenizer.tokenize(description);
    const keywords = tokens.filter(t => t.length > 2);
    
    // Determine price range (low/medium/high)
    const pricePercentile = (price - minPrice) / priceRange;
    const priceRangeCategory = 
      pricePercentile < 0.33 ? 'low' :
      pricePercentile > 0.67 ? 'high' : 'medium';
    
    features.set(product.id, {
      category: product.category,
      price: product.price,
      priceRange: priceRangeCategory,
      keywords: keywords,
      averageRating: product.averageRating
    });
  });
  
  return features;
}

// Build TF-IDF vectors
buildTFIDFVectors(products: Product[]): void {
  products.forEach(product => {
    const text = `${product.name} ${product.description} ${product.category}`;
    this.tfidf.addDocument(text);
  });
  
  // Create normalized vectors
  products.forEach((product, index) => {
    const vector = this.tfidf.listTerms(index).map(term => term.tfidf);
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    const normalized = magnitude > 0 ? vector.map(v => v / magnitude) : vector;
    this.productVectors.set(product.id, normalized);
  });
}

// Calculate cosine similarity
cosineSimilarity(vec1: number[], vec2: number[]): number {
  let dotProduct = 0, magnitude1 = 0, magnitude2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  return magnitude1 === 0 || magnitude2 === 0 
    ? 0 
    : dotProduct / (magnitude1 * magnitude2);
}
```

#### Ưu Điểm:
- ✅ Không cần dữ liệu từ users khác (no cold start cho products)
- ✅ Explainable (có thể giải thích tại sao recommend)
- ✅ Tốt cho niche products

#### Nhược Điểm:
- ❌ Không personalization sâu
- ❌ Không phát hiện được unexpected preferences

---

### 2. Collaborative Filtering

#### Thuật Toán:

**Bước 1: Build User-Item Matrix**
```typescript
// Matrix: userId -> productId -> score
userItemMatrix = {
  'user1': {
    'product1': 1.0,  // Purchased (weight: 1.0)
    'product2': 0.8    // Rated 4/5 (weight: rating/5)
  },
  'user2': {
    'product1': 0.6,   // Rated 3/5
    'product3': 1.0     // Purchased
  }
}

// Normalize scores per user
normalizedScore = score / maxScore(user)
```

**Bước 2: Build Item-Item Similarity Matrix**
```typescript
// Cosine similarity giữa products dựa trên user interactions
for (product1 in products) {
  for (product2 in products) {
    // Get users who interacted with both
    commonUsers = intersection(users(product1), users(product2));
    
    if (commonUsers.length >= minInteractions) {
      // Create vectors from common users' ratings
      vec1 = [user1.rating(product1), user2.rating(product1), ...]
      vec2 = [user1.rating(product2), user2.rating(product2), ...]
      
      similarity = cosineSimilarity(vec1, vec2);
      itemItemMatrix[product1][product2] = similarity;
    }
  }
}
```

**Bước 3: Build User-User Similarity Matrix**
```typescript
// Cosine similarity giữa users dựa trên product interactions
for (user1 in users) {
  for (user2 in users) {
    vec1 = userItemMatrix[user1];  // Vector of product ratings
    vec2 = userItemMatrix[user2];
    
    similarity = cosineSimilarity(vec1, vec2);
    userUserMatrix[user1][user2] = similarity;
  }
}
```

**Bước 4: Item-Based Recommendation**
```typescript
// Với mỗi product user chưa mua:
for (candidateProduct in allProducts) {
  score = 0;
  totalSimilarity = 0;
  
  // Sum similarities với products user đã mua
  for (purchasedProduct in userPurchasedProducts) {
    similarity = itemItemMatrix[purchasedProduct][candidateProduct];
    userRating = userItemMatrix[userId][purchasedProduct];
    
    score += userRating * similarity;
    totalSimilarity += Math.abs(similarity);
  }
  
  finalScore = score / totalSimilarity;
  recommendations.push({ productId: candidateProduct, score: finalScore });
}
```

**Bước 5: User-Based Recommendation**
```typescript
// Tìm top K similar users
similarUsers = topK(userUserMatrix[userId], k=10);

// Với mỗi product user chưa mua:
for (candidateProduct in allProducts) {
  score = 0;
  totalSimilarity = 0;
  
  for (similarUser in similarUsers) {
    similarity = userUserMatrix[userId][similarUser];
    rating = userItemMatrix[similarUser][candidateProduct];
    
    if (rating > 0) {
      score += rating * similarity;
      totalSimilarity += Math.abs(similarity);
    }
  }
  
  finalScore = score / totalSimilarity;
  recommendations.push({ productId: candidateProduct, score: finalScore });
}
```

#### Code Implementation:

```typescript:ai-service/src/ml/collaborative-filtering.ts
// Build user-item matrix
buildUserItemMatrix(data: TrainingData): void {
  // Initialize matrix
  data.users.forEach(user => {
    this.userItemMatrix.set(user.id, new Map());
  });
  
  // Add purchases (weight: 1.0)
  data.purchases.forEach(purchase => {
    const userMap = this.userItemMatrix.get(purchase.user_id);
    if (userMap) {
      const currentScore = userMap.get(purchase.product_id) || 0;
      userMap.set(purchase.product_id, currentScore + 1.0);
    }
  });
  
  // Add ratings (weight: rating / 5)
  data.ratings.forEach(rating => {
    const userMap = this.userItemMatrix.get(rating.user_id);
    if (userMap) {
      const ratingScore = rating.rating / 5.0; // Normalize to 0-1
      userMap.set(rating.product_id, 
        Math.max(userMap.get(rating.product_id) || 0, ratingScore)
      );
    }
  });
  
  // Normalize scores per user
  this.userItemMatrix.forEach((itemMap, userId) => {
    const maxScore = Math.max(...Array.from(itemMap.values()), 1);
    itemMap.forEach((score, productId) => {
      itemMap.set(productId, score / maxScore);
    });
  });
}

// Item-based recommendation
itemBasedRecommend(userId: string, allProducts: Product[], topN: number): Recommendation[] {
  const userItems = this.userItemMatrix.get(userId) || new Map();
  const recommendations: Recommendation[] = [];
  
  allProducts.forEach(product => {
    if (!userItems.has(product.id)) {
      let score = 0;
      let totalSimilarity = 0;
      
      // Sum similarities with products user has interacted with
      userItems.forEach((rating, interactedProductId) => {
        const itemSimilarities = this.itemItemMatrix.get(interactedProductId);
        if (itemSimilarities) {
          const similarity = itemSimilarities.get(product.id) || 0;
          score += rating * similarity;
          totalSimilarity += Math.abs(similarity);
        }
      });
      
      if (totalSimilarity > 0) {
        recommendations.push({
          productId: product.id,
          score: score / totalSimilarity,
          reason: 'Users with similar preferences also liked this',
          model: 'collaborative'
        });
      }
    }
  });
  
  return recommendations.sort((a, b) => b.score - a.score).slice(0, topN);
}
```

#### Ưu Điểm:
- ✅ Personalization tốt
- ✅ Phát hiện được unexpected preferences
- ✅ Tốt cho popular products

#### Nhược Điểm:
- ❌ Cold start problem (user mới, product mới)
- ❌ Cần nhiều dữ liệu (sparsity problem)
- ❌ Computational complexity cao (O(n²) cho similarity matrix)

---

### 3. Hybrid Recommender

#### Thuật Toán:

**Kết hợp Content-Based và Collaborative Filtering:**

```typescript
// Weighted combination
hybridScore = 
  contentBasedScore * contentWeight (0.4) +
  collaborativeScore * collaborativeWeight (0.6)

// Nếu một model không có data, fallback về model còn lại
if (collaborativeRecs.length === 0) {
  return contentBasedRecs;
}
if (contentBasedRecs.length === 0) {
  return collaborativeRecs;
}

// Combine và deduplicate
combined = merge(contentBasedRecs, collaborativeRecs);
// Average scores nếu product xuất hiện trong cả hai
```

#### Code Implementation:

```typescript:ai-service/src/ml/hybrid-recommender.ts
recommend(userId: string, userProfile: UserProfile, allProducts: Product[], topN: number): Recommendation[] {
  // Get recommendations from both models
  const contentRecs = this.contentBased.recommend(userProfile, allProducts, topN * 2);
  const collaborativeRecs = this.collaborative.hybridRecommend(userId, allProducts, topN * 2);
  
  // Combine recommendations
  const combined = new Map<string, Recommendation>();
  
  // Add content-based (weight: 0.4)
  contentRecs.forEach(rec => {
    combined.set(rec.productId, {
      ...rec,
      score: rec.score * this.weights.contentBased,
      model: 'hybrid',
      reason: 'Based on product similarity'
    });
  });
  
  // Add collaborative (weight: 0.6)
  collaborativeRecs.forEach(rec => {
    const existing = combined.get(rec.productId);
    if (existing) {
      // Combine scores
      existing.score = existing.score + (rec.score * this.weights.collaborative);
      existing.reason = 'Combined: product similarity + user preferences';
    } else {
      combined.set(rec.productId, {
        ...rec,
        score: rec.score * this.weights.collaborative,
        model: 'hybrid',
        reason: 'Users with similar preferences liked this'
      });
    }
  });
  
  // Handle cold start
  if (combined.size === 0) {
    return contentRecs.length > 0 ? contentRecs.slice(0, topN) : [];
  }
  
  // Sort by combined score and return top N
  return Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(rec => ({
      ...rec,
      score: Math.min(1.0, rec.score) // Normalize to 0-1
    }));
}
```

#### Ưu Điểm:
- ✅ Tốt nhất - kết hợp ưu điểm của cả hai
- ✅ Giải quyết cold start problem
- ✅ Personalization tốt + explainable

---

## 📊 Rule-Based AI Systems

### 1. Expense Insights Engine

#### Thuật Toán:

**10 Loại Insights được tạo từ Rules:**

```typescript
// 1. Negative Net Amount Warning
if (netAmount < 0) {
  insight = {
    type: 'warning',
    title: 'Spending Exceeds Earnings',
    message: `Spending ${Math.abs(netAmount)} coins more than earnings`,
    priority: 'high',
    confidence: 0.95
  };
}

// 2. High Spending Rate Alert
spendingRate = totalSpending / totalEarnings;
if (spendingRate > 0.9) {
  insight = {
    type: 'alert',
    title: 'High Spending Rate',
    message: `Spending ${spendingRate * 100}% of earnings`,
    priority: 'high',
    confidence: 0.9
  };
}

// 3. Category Concentration Warning
topCategoryPercentage = (topCategory.amount / totalSpending) * 100;
if (topCategoryPercentage > 60) {
  insight = {
    type: 'suggestion',
    title: 'Diversify Your Spending',
    message: `${topCategory} accounts for ${topCategoryPercentage}% of spending`,
    priority: 'medium',
    confidence: 0.8
  };
}

// 4. Low Balance Alert
if (balance < 50) {
  insight = {
    type: 'alert',
    title: 'Low Balance Warning',
    message: `Balance is low (${balance} coins)`,
    priority: 'high',
    confidence: 0.9
  };
}

// 5. Spending Trend Analysis
recentAvg = average(recent7Days);
earlierAvg = average(earlier7Days);
trendChange = ((recentAvg - earlierAvg) / earlierAvg) * 100;

if (trendChange > 30) {
  insight = {
    type: 'warning',
    title: 'Spending Trend Increasing',
    message: `Spending increased by ${trendChange}%`,
    priority: 'medium',
    confidence: 0.85
  };
}

// 6. Budget Recommendation
recommendedBudget = totalEarnings * 0.7; // 70% of earnings
if (totalSpending > recommendedBudget) {
  insight = {
    type: 'suggestion',
    title: 'Budget Recommendation',
    message: `Consider setting budget of ${recommendedBudget} coins`,
    priority: 'medium',
    confidence: 0.75
  };
}

// 7. Unusual Spending Pattern Detection
avgAmount = mean(transactionAmounts);
stdDev = standardDeviation(transactionAmounts);
largeTransactions = amounts.filter(a => a > avgAmount + 2 * stdDev);

if (largeTransactions.length > 0) {
  insight = {
    type: 'insight',
    title: 'Unusual Spending Detected',
    message: `${largeTransactions.length} unusually large transaction(s)`,
    priority: 'medium',
    confidence: 0.7
  };
}

// 8. Savings Opportunity
if (netAmount > 0 && netAmount > 100) {
  insight = {
    type: 'tip',
    title: 'Savings Opportunity',
    message: `You have ${netAmount} coins saved`,
    priority: 'low',
    confidence: 0.8
  };
}

// 9. Category-Specific Tips
categoryPercentage = (category.amount / totalSpending) * 100;
if (categoryPercentage > 40 && category === 'Shopping') {
  insight = {
    type: 'suggestion',
    title: 'Shopping Category High',
    message: `Shopping accounts for ${categoryPercentage}% of spending`,
    priority: 'medium',
    confidence: 0.75
  };
}

// 10. Earning vs Spending Balance
earningSpendingRatio = totalSpending / totalEarnings;
if (earningSpendingRatio < 0.5) {
  insight = {
    type: 'insight',
    title: 'Excellent Savings Rate',
    message: `Saving ${(1 - earningSpendingRatio) * 100}% of earnings`,
    priority: 'low',
    confidence: 0.9
  };
}
```

#### Code Implementation:

```typescript:ai-service/src/recommendation/expense-insights.ts
export function getExpenseInsights(input: ExpenseInsightsInput): ExpenseInsight[] {
  const insights: ExpenseInsight[] = [];
  const { balance, totalSpending, totalEarnings, netAmount, categoryBreakdown } = input;
  
  // 1. Negative Net Amount Warning
  if (netAmount < 0) {
    insights.push({
      type: 'warning',
      title: '⚠️ Spending Exceeds Earnings',
      message: `You're spending ${Math.abs(netAmount).toFixed(2)} coins more than you earn`,
      priority: 'high',
      actionType: 'reduce',
      confidence: 0.95
    });
  }
  
  // 2. High Spending Rate Alert
  const spendingRate = totalSpending / Math.max(totalEarnings, 1);
  if (spendingRate > 0.9 && totalEarnings > 0) {
    insights.push({
      type: 'alert',
      title: '🚨 High Spending Rate',
      message: `You're spending ${(spendingRate * 100).toFixed(0)}% of your earnings`,
      priority: 'high',
      actionType: 'save',
      confidence: 0.9
    });
  }
  
  // ... (các insights khác)
  
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
```

---

### 2. Spending Prediction

#### Thuật Toán: Linear Regression

```typescript
// Simple Linear Regression từ 14 ngày gần nhất
// y = slope * x + intercept

// Tính slope và intercept
n = data.length;
sumX = sum(i for i in range(n));
sumY = sum(amounts);
sumXY = sum(i * amount for i, amount in enumerate(data));
sumX2 = sum(i * i for i in range(n));

slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
intercept = (sumY - slope * sumX) / n;

// Predict cho 7 ngày tới
predictedAmount = (slope * n + intercept) * 7;

// Determine trend
if (slope > avgAmount * 0.1) → 'increasing'
else if (slope < -avgAmount * 0.1) → 'decreasing'
else → 'stable'

// Confidence dựa trên variance
variance = sum((actual - expected)²) / n;
confidence = 1 - (variance / (avgAmount² + 1));
```

#### Code Implementation:

```typescript:ai-service/src/recommendation/expense-insights.ts
export function predictFutureSpending(
  dailyTrend: Array<{ date: string; amount: number }>,
  days: number = 7
): { predictedAmount: number; confidence: number; trend: 'increasing' | 'decreasing' | 'stable' } {
  if (dailyTrend.length < 7) {
    return { predictedAmount: 0, confidence: 0.3, trend: 'stable' };
  }
  
  // Simple linear regression
  const recentData = dailyTrend.slice(-14);
  const n = recentData.length;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
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
    trend
  };
}
```

---

## 🎓 Quy Trình Training

### 1. Chuẩn Bị Dữ Liệu

```typescript
// Fetch data từ backend API
async function fetchTrainingData(): Promise<TrainingData> {
  const [productsRes, purchasesRes, ratingsRes, usersRes] = await Promise.all([
    axios.get(`${BACKEND_URL}/api/products?limit=1000`),
    axios.get(`${BACKEND_URL}/api/purchase-history/all`),
    axios.get(`${BACKEND_URL}/api/products/ratings/all`),
    axios.get(`${BACKEND_URL}/api/users?limit=1000`)
  ]);
  
  return {
    products: productsRes.data.products || [],
    purchases: purchasesRes.data.purchases || [],
    ratings: ratingsRes.data.ratings || [],
    interactions: [],
    users: usersRes.data.users || []
  };
}
```

### 2. Training Content-Based Model

```typescript
async function trainContentBased() {
  const data = await fetchTrainingData();
  
  if (data.products.length === 0) {
    console.log('No products found. Skipping training.');
    return;
  }
  
  // Create model instance
  const model = new ContentBasedModel();
  
  // Train model
  model.train(data.products);
  
  // Create metadata
  const metadata: ModelMetadata = {
    modelType: 'content-based',
    version: `1.${Date.now()}`,
    trainedAt: new Date().toISOString(),
    trainingDataSize: data.products.length,
    parameters: {
      featureWeights: {
        category: 0.3,
        price: 0.2,
        description: 0.3,
        rating: 0.2
      }
    }
  };
  
  // Save model
  const storage = new ModelStorage();
  const filepath = storage.saveModel('content-based', model.getState(), metadata);
  console.log(`✅ Content-Based model saved to: ${filepath}`);
}
```

### 3. Training Collaborative Filtering Model

```typescript
async function trainCollaborative() {
  const data = await fetchTrainingData();
  
  if (data.purchases.length === 0 && data.ratings.length === 0) {
    console.log('No purchase or rating data found. Skipping training.');
    return;
  }
  
  // Create model instance
  const model = new CollaborativeFilteringModel();
  
  // Train model
  model.train(data);
  
  // Create metadata
  const metadata: ModelMetadata = {
    modelType: 'collaborative',
    version: `1.${Date.now()}`,
    trainedAt: new Date().toISOString(),
    trainingDataSize: data.purchases.length + data.ratings.length,
    parameters: {
      minInteractions: 2
    }
  };
  
  // Save model
  const storage = new ModelStorage();
  const filepath = storage.saveModel('collaborative', model.getState(), metadata);
  console.log(`✅ Collaborative Filtering model saved to: ${filepath}`);
}
```

### 4. Training Hybrid Model

```typescript
async function trainHybrid() {
  const data = await fetchTrainingData();
  
  if (data.products.length === 0) {
    console.log('No data found. Skipping training.');
    return;
  }
  
  // Create model instance với weights
  const model = new HybridRecommender(0.4, 0.6); // content: 0.4, collaborative: 0.6
  
  // Train model (sẽ train cả content-based và collaborative)
  model.train(data);
  
  // Create metadata
  const metadata: ModelMetadata = {
    modelType: 'hybrid',
    version: `1.${Date.now()}`,
    trainedAt: new Date().toISOString(),
    trainingDataSize: data.products.length + data.purchases.length + data.ratings.length,
    parameters: {
      contentWeight: 0.4,
      collaborativeWeight: 0.6
    }
  };
  
  // Save model
  const storage = new ModelStorage();
  const filepath = storage.saveModel('hybrid', model.getState(), metadata);
  console.log(`✅ Hybrid model saved to: ${filepath}`);
}
```

### 5. Chạy Training

```bash
# Train tất cả models
cd ai-service
npm run train

# Train từng model riêng
npm run train:content          # Content-Based only
npm run train:collaborative    # Collaborative only
npm run train:hybrid          # Hybrid (recommended)
```

### 6. Model Loading (Khi Service Khởi Động)

```typescript:ai-service/src/index.ts
async function loadMLModels() {
  try {
    console.log('Loading ML models...');
    
    // Try to load hybrid model (preferred)
    const hybridData = modelStorage.loadLatestModel('hybrid');
    if (hybridData) {
      hybridModel = new HybridRecommender();
      hybridModel.loadState(hybridData.state);
      console.log('✅ Hybrid model loaded');
    } else {
      // Fallback to individual models
      const contentData = modelStorage.loadLatestModel('content-based');
      if (contentData) {
        contentModel = new ContentBasedModel();
        contentModel.loadState(contentData.state);
        console.log('✅ Content-Based model loaded');
      }
      
      const collabData = modelStorage.loadLatestModel('collaborative');
      if (collabData) {
        collaborativeModel = new CollaborativeFilteringModel();
        collaborativeModel.loadState(collabData.state);
        console.log('✅ Collaborative Filtering model loaded');
      }
    }
    
    if (!hybridModel && !contentModel && !collaborativeModel) {
      console.log('⚠️  No ML models found. Using rule-based recommendations.');
    }
  } catch (error) {
    console.error('Error loading ML models:', error);
  }
}

// Load models on startup
loadMLModels();
```

---

## 💾 Model Storage & Versioning

### Cấu Trúc Lưu Trữ:

```
ai-service/models/
├── hybrid_1.1766460347526_2025-12-23T03-25-47-527Z.json
├── hybrid_latest.json
├── content-based_1.1766460347526_2025-12-23T03-25-47-527Z.json
├── content-based_latest.json
├── collaborative_1.1766460347526_2025-12-23T03-25-47-527Z.json
└── collaborative_latest.json
```

### Format File Model:

```json
{
  "metadata": {
    "modelType": "hybrid",
    "version": "1.1766460347526",
    "trainedAt": "2025-12-23T03:25:47.527Z",
    "trainingDataSize": 150,
    "parameters": {
      "contentWeight": 0.4,
      "collaborativeWeight": 0.6
    }
  },
  "state": {
    "contentBased": {
      "productFeatures": [...],
      "productVectors": [...],
      "featureWeights": {...}
    },
    "collaborative": {
      "userItemMatrix": [...],
      "itemItemMatrix": [...],
      "userUserMatrix": [...]
    },
    "weights": {
      "contentBased": 0.4,
      "collaborative": 0.6
    }
  },
  "savedAt": "2025-12-23T03:25:47.527Z"
}
```

### Model Storage Implementation:

```typescript:ai-service/src/ml/model-storage.ts
export class ModelStorage {
  private modelsDir: string;
  
  constructor(modelsDir: string = './models') {
    this.modelsDir = modelsDir;
    this.ensureDirectoryExists();
  }
  
  // Save model to disk
  saveModel(
    modelType: 'content-based' | 'collaborative' | 'hybrid',
    modelState: any,
    metadata: ModelMetadata
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${modelType}_${metadata.version}_${timestamp}.json`;
    const filepath = path.join(this.modelsDir, filename);
    
    const modelData = {
      metadata,
      state: modelState,
      savedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filepath, JSON.stringify(modelData, null, 2));
    
    // Update latest model reference
    const latestPath = path.join(this.modelsDir, `${modelType}_latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(modelData, null, 2));
    
    return filepath;
  }
  
  // Load latest model
  loadLatestModel(modelType: 'content-based' | 'collaborative' | 'hybrid'): {
    metadata: ModelMetadata;
    state: any;
  } | null {
    const latestPath = path.join(this.modelsDir, `${modelType}_latest.json`);
    
    if (!fs.existsSync(latestPath)) {
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
    return {
      metadata: data.metadata,
      state: data.state
    };
  }
  
  // List all model versions
  listModels(modelType?: 'content-based' | 'collaborative' | 'hybrid'): ModelMetadata[] {
    const files = fs.readdirSync(this.modelsDir);
    const models: ModelMetadata[] = [];
    
    files.forEach(file => {
      if (file.endsWith('.json') && !file.includes('_latest')) {
        const filepath = path.join(this.modelsDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
          if (!modelType || data.metadata.modelType === modelType) {
            models.push(data.metadata);
          }
        } catch (error) {
          console.error(`Error reading model file ${file}:`, error);
        }
      }
    });
    
    return models.sort((a, b) => 
      new Date(b.trainedAt).getTime() - new Date(a.trainedAt).getTime()
    );
  }
}
```

---

## 📈 Độ Tin Cậy & Accuracy

### 1. ML Models Accuracy

#### Content-Based Filtering:
- **Accuracy**: Phụ thuộc vào chất lượng features
- **Confidence Score**: 0.0 - 1.0 (cosine similarity)
- **Độ Tin Cậy**: 
  - ✅ Cao khi user có purchase history rõ ràng
  - ⚠️ Thấp khi user mới (cold start)
  - ✅ Tốt cho products có features rõ ràng

#### Collaborative Filtering:
- **Accuracy**: Phụ thuộc vào số lượng interactions
- **Confidence Score**: 0.0 - 1.0 (weighted similarity)
- **Độ Tin Cậy**:
  - ✅ Cao khi có nhiều users và interactions
  - ❌ Thấp khi data sparse (sparsity problem)
  - ❌ Không hoạt động với user/product mới

#### Hybrid Recommender:
- **Accuracy**: Tốt nhất (kết hợp cả hai)
- **Confidence Score**: 0.0 - 1.0 (weighted combination)
- **Độ Tin Cậy**:
  - ✅ Cao nhất trong 3 models
  - ✅ Giải quyết cold start problem
  - ✅ Cân bằng giữa personalization và explainability

### 2. Rule-Based AI Confidence

#### Expense Insights:
- **Confidence**: 0.7 - 0.95 (dựa trên rules)
- **Độ Tin Cậy**:
  - ✅ Rất cao cho các rules đơn giản (netAmount < 0)
  - ✅ Cao cho statistical analysis (spending rate, trends)
  - ⚠️ Trung bình cho pattern detection (unusual spending)

#### Spending Prediction:
- **Confidence**: 0.3 - 0.9 (dựa trên variance)
- **Độ Tin Cậy**:
  - ✅ Cao khi data consistent (low variance)
  - ⚠️ Thấp khi data noisy (high variance)
  - ✅ Tốt cho short-term prediction (7 days)

### 3. Metrics Đánh Giá

#### ML Models:
```typescript
// Có thể thêm metrics sau:
interface ModelMetrics {
  accuracy?: number;           // Precision/Recall
  mse?: number;                // Mean Squared Error
  coverage?: number;            // % products được recommend
  diversity?: number;           // Độ đa dạng recommendations
  novelty?: number;             // Độ mới của recommendations
}
```

#### Rule-Based:
```typescript
// Metrics hiện tại:
interface InsightMetrics {
  confidence: number;          // 0.0 - 1.0
  priority: 'high' | 'medium' | 'low';
  actionType?: string;          // Loại action đề xuất
}
```

### 4. Cải Thiện Độ Tin Cậy

#### Cho ML Models:
1. **Tăng Training Data**: Thu thập thêm purchases, ratings
2. **Feature Engineering**: Thêm features (brand, tags, etc.)
3. **Hyperparameter Tuning**: Điều chỉnh weights, thresholds
4. **Regular Retraining**: Retrain định kỳ với data mới
5. **A/B Testing**: So sánh performance giữa các models

#### Cho Rule-Based:
1. **Fine-tune Thresholds**: Điều chỉnh ngưỡng (0.9 → 0.85)
2. **Add More Rules**: Thêm rules cho edge cases
3. **User Feedback**: Thu thập feedback để cải thiện rules
4. **Statistical Validation**: Validate rules với historical data

---

## 🔌 API Endpoints

### 1. ML Recommendations

```http
POST /ml/recommendations
Content-Type: application/json

{
  "userId": "user-id",
  "modelType": "hybrid",  // "hybrid" | "content-based" | "collaborative"
  "topN": 10,
  "products": [...]  // Optional: pass products directly
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

### 2. Train Models

```http
POST /ml/train
Content-Type: application/json

{
  "modelType": "all"  // "all" | "content-based" | "collaborative" | "hybrid"
}
```

**Response:**
```json
{
  "message": "Training started",
  "modelType": "all",
  "note": "Training is running in background. Check logs for progress."
}
```

### 3. List Models

```http
GET /ml/models
```

**Response:**
```json
{
  "models": [
    {
      "modelType": "hybrid",
      "version": "1.1766460347526",
      "trainedAt": "2025-12-23T03:25:47.527Z",
      "trainingDataSize": 150,
      "parameters": {
        "contentWeight": 0.4,
        "collaborativeWeight": 0.6
      }
    }
  ]
}
```

### 4. Get Model Info

```http
GET /ml/models/hybrid
```

**Response:**
```json
{
  "model": {
    "modelType": "hybrid",
    "version": "1.1766460347526",
    "trainedAt": "2025-12-23T03:25:47.527Z",
    "trainingDataSize": 150,
    "parameters": {
      "contentWeight": 0.4,
      "collaborativeWeight": 0.6
    }
  }
}
```

### 5. Expense Insights

```http
POST /insights/expense
Content-Type: application/json

{
  "userId": "user-id",
  "balance": 1000,
  "period": "month",
  "totalSpending": 800,
  "totalEarnings": 1000,
  "netAmount": 200,
  "categoryBreakdown": {
    "Shopping": { "amount": 400, "count": 5 },
    "Food": { "amount": 300, "count": 10 }
  },
  "recentTransactions": [...],
  "dailyTrend": [...]
}
```

**Response:**
```json
{
  "insights": [
    {
      "type": "insight",
      "title": "Excellent Savings Rate",
      "message": "You're saving 20% of your earnings",
      "priority": "low",
      "actionType": "save",
      "confidence": 0.9
    }
  ],
  "prediction": {
    "predictedAmount": 750,
    "confidence": 0.85,
    "trend": "stable"
  },
  "source": "ai-engine"
}
```

### 6. Spending Recommendations

```http
POST /recommendations/spending
Content-Type: application/json

{
  "userId": "user-id",
  "balance": 1000,
  "recentTransactions": [...],
  "availableProducts": [...],
  "availableGames": [...]
}
```

### 7. Investment Recommendations

```http
POST /recommendations/investing
Content-Type: application/json

{
  "userId": "user-id",
  "balance": 1000,
  "portfolio": [...],
  "availableStocks": [...],
  "transactionHistory": [...]
}
```

### 8. Transaction Categorization

```http
POST /categorize-transaction
Content-Type: application/json

{
  "transaction": {
    "description": "Bought laptop",
    "amount": 500
  },
  "userHistory": [...]
}
```

**Response:**
```json
{
  "category": "electronics",
  "confidence": 0.9,
  "source": "ai-engine"
}
```

---

## 💻 Code Examples

### 1. Sử Dụng ML Recommendations trong Frontend

```typescript
// frontend/src/services/recommendation.service.ts
import { api } from './api';

const AI_SERVICE_URL = 'http://localhost:3003';

export async function getMLRecommendations(
  userId: string,
  modelType: 'hybrid' | 'content-based' | 'collaborative' = 'hybrid',
  topN: number = 10
) {
  try {
    const response = await api.post(`${AI_SERVICE_URL}/ml/recommendations`, {
      userId,
      modelType,
      topN
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ML recommendations:', error);
    return { recommendations: [], source: 'ml-model', model: modelType };
  }
}

// Usage trong component
const { data: recommendations } = useQuery({
  queryKey: ['mlRecommendations', userId],
  queryFn: () => getMLRecommendations(userId, 'hybrid', 10)
});
```

### 2. Train Model Programmatically

```typescript
// backend/src/services/ai-training.service.ts
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3003';

export async function trainMLModels(modelType: 'all' | 'hybrid' = 'all') {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ml/train`, {
      modelType
    });
    return response.data;
  } catch (error) {
    console.error('Error training models:', error);
    throw error;
  }
}

// Schedule training (ví dụ: cron job)
// Train models mỗi ngày lúc 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Starting scheduled model training...');
  await trainMLModels('all');
  console.log('Model training completed.');
});
```

### 3. Custom Training Script

```typescript
// scripts/train-models.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function trainModels() {
  console.log('Starting model training...');
  
  try {
    // Train hybrid model
    console.log('Training hybrid model...');
    const { stdout, stderr } = await execAsync('cd ai-service && npm run train:hybrid');
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ Model training completed!');
  } catch (error) {
    console.error('❌ Training failed:', error);
    process.exit(1);
  }
}

trainModels();
```

---

## 🎯 Best Practices

### 1. Training Best Practices

- ✅ **Train định kỳ**: Retrain models khi có đủ data mới (hàng tuần/tháng)
- ✅ **Validate data**: Kiểm tra chất lượng data trước khi train
- ✅ **Version control**: Lưu version của models để có thể rollback
- ✅ **A/B testing**: So sánh performance giữa các model versions
- ✅ **Monitor performance**: Track accuracy, coverage, diversity metrics

### 2. Model Selection

- ✅ **Hybrid model**: Sử dụng hybrid model cho production (tốt nhất)
- ✅ **Fallback mechanism**: Fallback về rule-based nếu ML models không available
- ✅ **Cold start handling**: Xử lý user/product mới bằng content-based hoặc popular items

### 3. Performance Optimization

- ✅ **Cache recommendations**: Cache recommendations cho users để giảm computation
- ✅ **Background training**: Train models trong background job, không block API
- ✅ **Lazy loading**: Load models khi cần, không load tất cả khi startup
- ✅ **Batch processing**: Process recommendations theo batch thay vì từng user

### 4. Error Handling

- ✅ **Graceful degradation**: Fallback về rule-based nếu ML models fail
- ✅ **Error logging**: Log errors để debug và improve
- ✅ **Retry mechanism**: Retry khi training hoặc inference fail
- ✅ **Health checks**: Monitor model health và availability

### 5. Data Quality

- ✅ **Data validation**: Validate data trước khi train
- ✅ **Handle missing data**: Xử lý missing values, outliers
- ✅ **Data cleaning**: Remove duplicates, invalid records
- ✅ **Feature engineering**: Extract meaningful features từ raw data

---

## 📚 Tài Liệu Tham Khảo

- [ML Models Guide](./ML_MODELS_GUIDE.md)
- [AI System Explanation](./AI_SYSTEM_EXPLANATION.md)
- [AI Integration Guide](./AI_INTEGRATION_GUIDE.md)

---

## 🔮 Future Enhancements

- [ ] Matrix Factorization (SVD, NMF) cho Collaborative Filtering
- [ ] Deep Learning models (Neural Collaborative Filtering)
- [ ] Real-time model updates (incremental learning)
- [ ] A/B testing framework
- [ ] Model performance metrics dashboard
- [ ] AutoML cho hyperparameter tuning
- [ ] Multi-armed bandit cho exploration/exploitation
- [ ] Contextual bandits cho recommendations
- [ ] Reinforcement learning cho adaptive recommendations

---

**Tài liệu này được cập nhật lần cuối: 2025-12-23**



