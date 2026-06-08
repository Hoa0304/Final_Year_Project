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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Training state
let isTraining = false;
let lastTrainTime: string | null = null;

// Initialize ML models
const modelStorage = new ModelStorage();
let hybridModel: HybridRecommender | null = null;
let contentModel: ContentBasedModel | null = null;
let collaborativeModel: CollaborativeFilteringModel | null = null;

// Load ML models on startup
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

loadMLModels();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
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

// Spending recommendations endpoint
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

// Transaction categorization endpoint
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

// Item suggestions endpoint
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

// Expense insights endpoint
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

    // Get spending prediction
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

// ========== ML MODEL ENDPOINTS ==========

// ML-based product recommendations
app.post('/ml/recommendations', async (req, res) => {
  try {
    const { userId, modelType = 'hybrid', topN = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get products from request body (passed by backend) or fetch from API
    const productsFromBody = req.body.products;
    console.log('Products from body:', productsFromBody ? `${productsFromBody.length} products` : 'none');
    
    // Fetch user data and other data
    const [userRes, productsRes, purchasesRes, ratingsRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/api/users/${userId}`).catch((err) => {
        console.log('Failed to fetch user:', err.message);
        return null;
      }),
      // Only fetch products if not provided in request body
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
    // Use products from body if available, otherwise use fetched products
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

    // Build user profile
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

    // Use appropriate model
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
      // Fallback to rule-based
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

    // If no recommendations from ML models, fallback to popular products
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
      
      // Sort by rating if available, otherwise by price (cheapest first for new users)
      const sortedProducts = [...products].sort((a: any, b: any) => {
        // Try to get rating from product (may be in different format)
        const ratingA = a.averageRating || a.rating || 0;
        const ratingB = b.averageRating || b.rating || 0;
        const totalA = a.totalRatings || a.total_ratings || 0;
        const totalB = b.totalRatings || b.total_ratings || 0;
        
        // If both have ratings, sort by rating
        if (ratingA > 0 || ratingB > 0) {
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          return totalB - totalA;
        }
        
        // Otherwise, sort by price (cheapest first for new users)
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

// Function to run training
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
      
      // Reload models after training
      loadMLModels();
    });
  } catch (error) {
    isTraining = false;
    console.error('❌ Error starting training:', error);
  }
}

// Train ML models endpoint
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

// ========== SCHEDULED TASKS (CRON) ==========

// Run full training every day at 2:00 AM
cron.schedule('0 2 * * *', () => {
  console.log('⏰ Scheduled training triggered (2:00 AM)');
  runTraining('all');
});

console.log('📅 Scheduled training set for 2:00 AM daily');

// List available models
app.get('/ml/models', (req, res) => {
  try {
    const models = modelStorage.listModels();
    res.json({ models });
  } catch (error: any) {
    console.error('List models error:', error);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// Get model info
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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🤖 AI Service running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

