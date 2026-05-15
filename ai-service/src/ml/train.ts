/**
 * Training Script for ML Models
 * 
 * Usage:
 *   npm run train                    # Train all models
 *   npm run train:content            # Train content-based only
 *   npm run train:collaborative       # Train collaborative only
 *   npm run train:hybrid             # Train hybrid only
 */

import axios from 'axios';
import { ContentBasedModel } from './content-based';
import { CollaborativeFilteringModel } from './collaborative-filtering';
import { HybridRecommender } from './hybrid-recommender';
import { ModelStorage } from './model-storage';
import { TrainingData, ModelMetadata } from './types';

// Get backend API URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function fetchTrainingData(): Promise<TrainingData> {
  console.log('Fetching training data from backend...');
  
  try {
    // For training, we need admin token or public endpoints
    // For now, use a dummy admin token or make endpoints public for training
    // In production, use a service account token
    
    const adminToken = process.env.ADMIN_TOKEN || ''; // Set in .env for training
    
    const headers: any = {};
    if (adminToken) {
      headers.Authorization = `Bearer ${adminToken}`;
    }

    // Fetch all necessary data
    const [productsRes, purchasesRes, ratingsRes, usersRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/api/products?limit=1000`, { headers }),
      axios.get(`${BACKEND_URL}/api/purchase-history/all`, { headers }).catch(() => ({ data: { purchases: [] } })),
      axios.get(`${BACKEND_URL}/api/products/ratings/all`, { headers }).catch(() => ({ data: { ratings: [] } })),
      axios.get(`${BACKEND_URL}/api/users?limit=1000`, { headers }).catch(() => ({ data: { users: [] } })),
    ]);

    return {
      products: productsRes.data.products || [],
      purchases: purchasesRes.data.purchases || [],
      ratings: ratingsRes.data.ratings || [],
      interactions: [], // Can be added later
      users: usersRes.data.users || [],
    };
  } catch (error: any) {
    console.error('Error fetching training data:', error.message);
    // Return empty data instead of throwing to allow training with minimal data
    return {
      products: [],
      purchases: [],
      ratings: [],
      interactions: [],
      users: [],
    };
  }
}

async function trainContentBased() {
  console.log('\n=== Training Content-Based Model ===');
  const data = await fetchTrainingData();
  
  if (data.products.length === 0) {
    console.log('No products found. Skipping training.');
    return;
  }

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
}

async function trainCollaborative() {
  console.log('\n=== Training Collaborative Filtering Model ===');
  const data = await fetchTrainingData();
  
  if (data.purchases.length === 0 && data.ratings.length === 0) {
    console.log('No purchase or rating data found. Skipping training.');
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
    console.log('No data found. Skipping training.');
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

    console.log('\n✅ All models trained successfully!');
  } catch (error: any) {
    console.error('❌ Training failed:', error.message);
    process.exit(1);
  }
}

main();

