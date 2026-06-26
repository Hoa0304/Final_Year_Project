import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getSpendingRecommendations } from './recommendation/engine';
import { categorizeTransaction } from './recommendation/categorization';
import { getItemSuggestions } from './recommendation/suggestions';
import { getExpenseInsights, predictFutureSpending } from './recommendation/expense-insights';
import { HybridRecommender } from './ml/hybrid-recommender';
import { ContentBasedModel } from './ml/content-based';
import { CollaborativeFilteringModel } from './ml/collaborative-filtering';
import { ModelStorage } from './ml/model-storage';
import axios from 'axios';
import cron from 'node-cron';
import { exec } from 'child_process';

// Tải các biến môi trường
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Trạng thái huấn luyện
let isTraining = false;
let lastTrainTime: string | null = null;

// Khởi tạo các mô hình ML
const modelStorage = new ModelStorage();
let hybridModel: HybridRecommender | null = null;
let contentModel: ContentBasedModel | null = null;
let collaborativeModel: CollaborativeFilteringModel | null = null;

// Tải các mô hình ML khi khởi động
async function loadMLModels() {
  try {
    console.log('Loading ML models...');
    
    // Cố gắng tải mô hình lai (ưu tiên)
    const hybridData = modelStorage.loadLatestModel('hybrid');
    if (hybridData) {
      hybridModel = new HybridRecommender();
      hybridModel.loadState(hybridData.state);
      console.log('✅ Hybrid model loaded');
    } else {
      // Dự phòng sang các mô hình riêng lẻ
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

loadMLModels();

// Middleware (Phần mềm trung gian)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Kiểm tra trạng thái hệ thống (Health check)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-recommendation', 
    timestamp: new Date().toISOString(),
    isTraining,
    lastTrainTime,
    mlModels: {
      hybrid: hybridModel !== null,
      contentBased: contentModel !== null,
      collaborative: collaborativeModel !== null,
    }
  });
});

// Endpoint đề xuất chi tiêu
app.post('/recommendations/spending', async (req, res) => {
  try {
    const { userId, balance, recentTransactions, availableProducts } = req.body;

    const recommendations = getSpendingRecommendations({
      userId,
      balance,
      recentTransactions: recentTransactions || [],
      availableProducts: availableProducts || []
    });

    res.json({
      recommendations,
      source: 'ai-engine'
    });
  } catch (error: any) {
    console.error('Spending recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Endpoint phân loại giao dịch
app.post('/categorize-transaction', async (req, res) => {
  try {
    const { transaction, userHistory } = req.body;

    const result = categorizeTransaction(transaction, userHistory || []);

    res.json({
      category: result.category,
      confidence: result.confidence,
      source: 'ai-engine'
    });
  } catch (error: any) {
    console.error('Transaction categorization error:', error);
    res.status(500).json({ error: 'Failed to categorize transaction' });
  }
});

// Endpoint gợi ý sản phẩm
app.post('/suggestions/items', async (req, res) => {
  try {
    const { userId, transactions, purchaseHistory, availableProducts } = req.body;

    const suggestions = getItemSuggestions({
      userId,
      transactions: transactions || [],
      purchaseHistory: purchaseHistory || [],
      availableProducts: availableProducts || []
    });

    res.json({
      suggestions,
      source: 'ai-engine'
    });
  } catch (error: any) {
    console.error('Item suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Endpoint thông tin chi tiêu
app.post('/insights/expense', async (req, res) => {
  try {
    const {
      userId,
      balance,
      period,
      totalSpending,
      totalEarnings,
      netAmount,
      categoryBreakdown,
      recentTransactions,
      dailyTrend,
    } = req.body;

    const insights = getExpenseInsights({
      userId,
      balance: balance || 0,
      period: period || 'month',
      totalSpending: totalSpending || 0,
      totalEarnings: totalEarnings || 0,
      netAmount: netAmount || 0,
      categoryBreakdown: categoryBreakdown || {},
      recentTransactions: recentTransactions || [],
      dailyTrend: dailyTrend || [],
    });

    // Lấy dự đoán chi tiêu
    const prediction = predictFutureSpending(dailyTrend || [], 7);

    res.json({
      insights,
      prediction,
      source: 'ai-engine',
    });
  } catch (error: any) {
    console.error('Expense insights error:', error);
    res.status(500).json({ error: 'Failed to generate expense insights' });
  }
});

// ========== CÁC ENDPOINT MÔ HÌNH ML ==========

// Đề xuất sản phẩm dựa trên ML
app.post('/ml/recommendations', async (req, res) => {
  try {
    const { userId, modelType = 'hybrid', topN = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Lấy sản phẩm từ nội dung yêu cầu (do backend truyền) hoặc tải từ API
    const productsFromBody = req.body.products;
    console.log('Products from body:', productsFromBody ? `${productsFromBody.length} products` : 'none');
    
    // Tải dữ liệu người dùng và dữ liệu khác
    const [userRes, productsRes, purchasesRes, ratingsRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/api/users/${userId}`).catch((err) => {
        console.log('Failed to fetch user:', err.message);
        return null;
      }),
      // Chỉ tải sản phẩm nếu không được cung cấp trong nội dung yêu cầu
      productsFromBody && Array.isArray(productsFromBody) && productsFromBody.length > 0
        ? Promise.resolve({ data: { products: productsFromBody } })
        : axios.get(`${BACKEND_URL}/api/products?limit=1000`).catch((err) => {
            console.error('Failed to fetch products:', err.message);
            console.error('Products API URL:', `${BACKEND_URL}/api/products?limit=1000`);
            return { data: { products: [] } };
          }),
      axios.get(`${BACKEND_URL}/api/purchase-history/user/${userId}`).catch((err) => {
        console.log('Failed to fetch purchases:', err.message);
        return { data: { purchases: [] } };
      }),
      axios.get(`${BACKEND_URL}/api/products/ratings/user/${userId}`).catch((err) => {
        console.log('Failed to fetch ratings:', err.message);
        return { data: { ratings: [] } };
      }),
    ]);

    const user = userRes?.data?.user;
    // Sử dụng sản phẩm từ nội dung yêu cầu nếu có, nếu không thì sử dụng sản phẩm đã tải
    const products = (productsFromBody && Array.isArray(productsFromBody) && productsFromBody.length > 0)
      ? productsFromBody
      : (productsRes.data.products || []);
    const purchases = purchasesRes.data.purchases || [];
    const ratings = ratingsRes.data.ratings || [];

    console.log('ML Recommendations Request:', {
      userId,
      modelType,
      topN,
      productsCount: products.length,
      purchasesCount: purchases.length,
      ratingsCount: ratings.length,
    });

    if (products.length === 0) {
      console.log('No products available');
      return res.json({ recommendations: [], source: 'ml-model', model: modelType });
    }

    // Xây dựng hồ sơ người dùng
    const userProfile = {
      userId: userId,
      preferences: {
        preferredCategories: [],
        priceRange: { min: 0, max: Infinity },
        averageSpending: 0,
        purchaseFrequency: purchases.length,
      },
      purchaseHistory: purchases,
      ratings: ratings,
      interactions: [],
    };

    let recommendations: any[] = [];

    // Sử dụng mô hình phù hợp
    if (modelType === 'hybrid' && hybridModel) {
      console.log('Using hybrid model');
      recommendations = hybridModel.recommend(userId, userProfile, products, topN);
      console.log(`Hybrid model returned ${recommendations.length} recommendations`);
    } else if (modelType === 'content-based' && contentModel) {
      console.log('Using content-based model');
      recommendations = contentModel.recommend(userProfile, products, topN);
      console.log(`Content-based model returned ${recommendations.length} recommendations`);
    } else if (modelType === 'collaborative' && collaborativeModel) {
      console.log('Using collaborative model');
      recommendations = collaborativeModel.hybridRecommend(userId, products, topN);
      console.log(`Collaborative model returned ${recommendations.length} recommendations`);
    } else {
      console.log('No ML models available, using rule-based fallback');
      // Dự phòng sang hệ thống dựa trên quy tắc
      const ruleBasedRecs = getSpendingRecommendations({
        userId,
        balance: user?.virtual_balance || 0,
        recentTransactions: [],
        availableProducts: products,
      });
      recommendations = ruleBasedRecs
        .filter(rec => rec.actionType === 'product' && rec.actionId)
        .map(rec => ({
          productId: rec.actionId!,
          score: rec.confidence,
          reason: rec.description,
          model: 'rule-based' as const,
        }));
      console.log(`Rule-based returned ${recommendations.length} recommendations`);
    }

    // Nếu không có đề xuất từ mô hình ML, dự phòng sang các sản phẩm phổ biến
    if (recommendations.length === 0 && products.length > 0) {
      console.log('⚠️ No ML recommendations, falling back to popular products');
      console.log(`Available products: ${products.length}`);
      console.log('Sample product:', products[0] ? {
        id: products[0].id,
        name: products[0].name,
        price: products[0].price,
        averageRating: (products[0] as any).averageRating,
        totalRatings: (products[0] as any).totalRatings,
      } : 'none');
      
      // Sắp xếp theo xếp hạng nếu có, nếu không thì theo giá (rẻ nhất trước cho người dùng mới)
      const sortedProducts = [...products].sort((a: any, b: any) => {
        // Cố gắng lấy xếp hạng từ sản phẩm (có thể ở định dạng khác)
        const ratingA = a.averageRating || a.rating || 0;
        const ratingB = b.averageRating || b.rating || 0;
        const totalA = a.totalRatings || a.total_ratings || 0;
        const totalB = b.totalRatings || b.total_ratings || 0;
        
        // Nếu cả hai đều có xếp hạng, sắp xếp theo xếp hạng
        if (ratingA > 0 || ratingB > 0) {
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          return totalB - totalA;
        }
        
        // Nếu không, sắp xếp theo giá (rẻ nhất trước cho người dùng mới)
        return (a.price || 0) - (b.price || 0);
      });
      
      const modelTypeValue = modelType === 'hybrid' ? 'hybrid' : modelType === 'content-based' ? 'content-based' : 'collaborative';
      
      recommendations = sortedProducts
        .slice(0, topN)
        .map((p: any) => ({
          productId: p.id,
          score: 0.6, // Default score for popular products
          reason: 'Popular product',
          model: modelTypeValue,
        }));
      
      console.log(`✅ Fallback recommendations created: ${recommendations.length}`);
      console.log('Recommendation IDs:', recommendations.map(r => r.productId));
    } else if (recommendations.length === 0) {
      console.log('❌ No recommendations and no products available');
    }

    console.log(`📤 Sending ${recommendations.length} recommendations to client`);
    console.log('Final recommendations:', recommendations.slice(0, 3).map(r => ({ productId: r.productId, score: r.score })));

    res.json({
      recommendations,
      source: 'ml-model',
      model: modelType,
      count: recommendations.length,
    });
  } catch (error: any) {
    console.error('ML recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate ML recommendations' });
  }
});

// Hàm chạy quá trình huấn luyện
async function runTraining(modelType: string = 'all') {
  if (isTraining) {
    console.log('⚠️ Training already in progress, skipping...');
    return;
  }

  isTraining = true;
  console.log(`🚀 Starting background training for model: ${modelType}`);

  try {
    const command = modelType === 'all' 
      ? 'npm run train'
      : `npm run train:${modelType}`;
    
    exec(command, (error: any, stdout: string, stderr: string) => {
      isTraining = false;
      if (error) {
        console.error('❌ Training error:', error);
        return;
      }
      
      console.log('✅ Training completed successfully');
      lastTrainTime = new Date().toISOString();
      
      // Tải lại mô hình sau khi huấn luyện
      loadMLModels();
    });
  } catch (error) {
    isTraining = false;
    console.error('❌ Error starting training:', error);
  }
}

// Endpoint huấn luyện các mô hình ML
app.post('/ml/train', async (req, res) => {
  try {
    const { modelType = 'all' } = req.body;

    if (isTraining) {
      return res.status(429).json({ 
        error: 'Training already in progress',
        note: 'Please wait for the current training to complete.'
      });
    }

    runTraining(modelType);

    res.json({
      message: 'Training started',
      modelType,
      note: 'Training is running in background. Check /health for status.',
    });
  } catch (error: any) {
    console.error('Train model error:', error);
    res.status(500).json({ error: 'Failed to start training' });
  }
});

// ========== CÁC TÁC VỤ ĐƯỢC LÊN LỊCH (CRON) ==========

// Chạy huấn luyện đầy đủ mỗi ngày vào lúc 2:00 sáng
cron.schedule('0 2 * * *', () => {
  console.log('⏰ Scheduled training triggered (2:00 AM)');
  runTraining('all');
});

console.log('📅 Scheduled training set for 2:00 AM daily');

// Liệt kê các mô hình có sẵn
app.get('/ml/models', (req, res) => {
  try {
    const models = modelStorage.listModels();
    res.json({ models });
  } catch (error: any) {
    console.error('List models error:', error);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// Lấy thông tin mô hình
app.get('/ml/models/:modelType', (req, res) => {
  try {
    const { modelType } = req.params;
    const model = modelStorage.loadLatestModel(modelType as any);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ model: model.metadata });
  } catch (error: any) {
    console.error('Get model info error:', error);
    res.status(500).json({ error: 'Failed to get model info' });
  }
});

// Xử lý lỗi
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Trình xử lý 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🤖 AI Service running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

