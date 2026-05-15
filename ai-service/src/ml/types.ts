/**
 * ML Model Types and Interfaces
 */

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  created_by?: string;
  averageRating?: number;
  totalRatings?: number;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface Purchase {
  user_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  created_at: string;
}

export interface Rating {
  user_id: string;
  product_id: string;
  rating: number;
  created_at: string;
}

export interface UserInteraction {
  user_id: string;
  product_id: string;
  interaction_type: 'view' | 'purchase' | 'rating' | 'cart_add' | 'cart_remove';
  timestamp: string;
  metadata?: any;
}

export interface ContentFeatures {
  productId: string;
  features: {
    category?: string;
    price: number;
    priceRange: 'low' | 'medium' | 'high';
    description?: string;
    keywords: string[];
    averageRating?: number;
    totalRatings?: number;
  };
}

export interface UserProfile {
  userId: string;
  preferences: {
    preferredCategories: string[];
    priceRange: { min: number; max: number };
    averageSpending: number;
    purchaseFrequency: number;
  };
  purchaseHistory: Purchase[];
  ratings: Rating[];
  interactions: UserInteraction[];
}

export interface Recommendation {
  productId: string;
  score: number;
  reason: string;
  model: 'content-based' | 'collaborative' | 'hybrid';
}

export interface ModelMetadata {
  modelType: 'content-based' | 'collaborative' | 'hybrid';
  version: string;
  trainedAt: string;
  trainingDataSize: number;
  accuracy?: number;
  parameters: any;
}

export interface TrainingData {
  products: Product[];
  purchases: Purchase[];
  ratings: Rating[];
  interactions: UserInteraction[];
  users: User[];
}















