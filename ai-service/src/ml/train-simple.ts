/**
 * Simple Training Script - Works with minimal data
 * 
 * This script trains models even with minimal data for initial setup
 */

import { ContentBasedModel } from './content-based';
import { CollaborativeFilteringModel } from './collaborative-filtering';
import { HybridRecommender } from './hybrid-recommender';
import { ModelStorage } from './model-storage';
import { TrainingData, ModelMetadata, Product, Purchase, Rating, User } from './types';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function fetchTrainingData(): Promise<TrainingData> {
  console.log('Fetching training data from backend...');
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  try {
    // Try to fetch data, but don't fail if endpoints don't exist yet
    const [productsRes, purchasesRes, ratingsRes, usersRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/api/products?limit=1000`, { timeout: 5000 }).catch((err) => {
        console.log(`⚠️  Products endpoint failed: ${err.message}`);
        return { data: { products: [] } };
      }),
      axios.get(`${BACKEND_URL}/api/purchase-history/all`, { timeout: 5000 }).catch((err) => {
        console.log(`⚠️  Purchase history endpoint failed: ${err.message}`);
        return { data: { purchases: [] } };
      }),
      axios.get(`${BACKEND_URL}/api/products/ratings/all`, { timeout: 5000 }).catch((err) => {
        console.log(`⚠️  Ratings endpoint failed: ${err.message}`);
        return { data: { ratings: [] } };
      }),
      axios.get(`${BACKEND_URL}/api/users?limit=1000`, { timeout: 5000 }).catch((err) => {
        console.log(`⚠️  Users endpoint failed: ${err.message}`);
        return { data: { users: [] } };
      }),
    ]);

    const products = productsRes.data.products || [];
    const purchases = purchasesRes.data.purchases || [];
    const ratings = ratingsRes.data.ratings || [];
    const users = usersRes.data.users || [];

    console.log(`✅ Fetched: ${products.length} products, ${purchases.length} purchases, ${ratings.length} ratings, ${users.length} users`);

    // If no data, create sample data for initial training
    if (products.length === 0 && purchases.length === 0 && ratings.length === 0) {
      console.log('📝 No data found. Creating sample data for initial training...');
      return createSampleData();
    }

    return {
      products,
      purchases,
      ratings,
      interactions: [],
      users,
    };
  } catch (error: any) {
    console.error('Error fetching training data:', error.message);
    console.log('📝 Creating sample data for initial training...');
    return createSampleData();
  }
}

/**
 * Create sample data for initial training when no real data exists
 */
function createSampleData(): TrainingData {
  const sampleProducts: Product[] = [
    {
      id: 'sample-1',
      name: 'Sample Product 1',
      description: 'A sample product for training',
      price: 100,
      category: 'Electronics',
    },
    {
      id: 'sample-2',
      name: 'Sample Product 2',
      description: 'Another sample product',
      price: 200,
      category: 'Clothing',
    },
    {
      id: 'sample-3',
      name: 'Sample Product 3',
      description: 'Yet another sample',
      price: 150,
      category: 'Food',
    },
  ];

  const sampleUsers: User[] = [
    { id: 'user-1', email: 'user1@example.com' },
    { id: 'user-2', email: 'user2@example.com' },
  ];

  return {
    products: sampleProducts,
    purchases: [],
    ratings: [],
    interactions: [],
    users: sampleUsers,
  };
}

async function trainContentBased() {
  console.log('\n=== Training Content-Based Model ===');
  const data = await fetchTrainingData();
  
  if (data.products.length === 0) {
    console.log('⚠️  No products found. Cannot train content-based model.');
    console.log('💡 Add some products to the system first, then train again.');
    return;
  }

  console.log(`Training with ${data.products.length} products...`);
  const model = new ContentBasedModel();
  model.train(data.products);

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
        rating: 0.2,
      },
    },
  };

  const storage = new ModelStorage();
  const filepath = storage.saveModel('content-based', model.getState(), metadata);
  console.log(`✅ Content-Based model saved to: ${filepath}`);
  console.log(`   Model version: ${metadata.version}`);
}

async function trainCollaborative() {
  console.log('\n=== Training Collaborative Filtering Model ===');
  const data = await fetchTrainingData();
  
  if (data.purchases.length === 0 && data.ratings.length === 0) {
    console.log('⚠️  No purchase or rating data found. Skipping training.');
    return;
  }

  const model = new CollaborativeFilteringModel();
  model.train(data);

  const metadata: ModelMetadata = {
    modelType: 'collaborative',
    version: `1.${Date.now()}`,
    trainedAt: new Date().toISOString(),
    trainingDataSize: data.purchases.length + data.ratings.length,
    parameters: {
      minInteractions: 2,
    },
  };

  const storage = new ModelStorage();
  const filepath = storage.saveModel('collaborative', model.getState(), metadata);
  console.log(`✅ Collaborative Filtering model saved to: ${filepath}`);
}

async function trainHybrid() {
  console.log('\n=== Training Hybrid Model ===');
  const data = await fetchTrainingData();
  
  if (data.products.length === 0) {
    console.log('⚠️  No data found. Skipping training.');
    return;
  }

  const model = new HybridRecommender(0.4, 0.6);
  model.train(data);

  const metadata: ModelMetadata = {
    modelType: 'hybrid',
    version: `1.${Date.now()}`,
    trainedAt: new Date().toISOString(),
    trainingDataSize: data.products.length + data.purchases.length + data.ratings.length,
    parameters: {
      contentWeight: 0.4,
      collaborativeWeight: 0.6,
    },
  };

  const storage = new ModelStorage();
  const filepath = storage.saveModel('hybrid', model.getState(), metadata);
  console.log(`✅ Hybrid model saved to: ${filepath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const modelType = args.find(arg => arg.startsWith('--model'))?.split('=')[1];

  try {
    if (!modelType || modelType === 'content') {
      await trainContentBased();
    }
    
    if (!modelType || modelType === 'collaborative') {
      await trainCollaborative();
    }
    
    if (!modelType || modelType === 'hybrid') {
      await trainHybrid();
    }

    console.log('\n✅ Training completed!');
    console.log('💡 Models will be automatically loaded when AI service restarts.');
  } catch (error: any) {
    console.error('❌ Training failed:', error.message);
    process.exit(1);
  }
}

main();

