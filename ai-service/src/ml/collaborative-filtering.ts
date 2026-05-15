/**
 * Collaborative Filtering Model
 * 
 * Recommends products based on similar users' preferences.
 * Implements both User-Based and Item-Based Collaborative Filtering.
 */

import { Matrix } from 'ml-matrix';
import { Product, UserProfile, Purchase, Rating, Recommendation, TrainingData } from './types';

export class CollaborativeFilteringModel {
  private userItemMatrix: Map<string, Map<string, number>>; // userId -> productId -> rating/score
  private itemItemMatrix: Map<string, Map<string, number>>; // productId -> productId -> similarity
  private userUserMatrix: Map<string, Map<string, number>>; // userId -> userId -> similarity
  private minInteractions: number = 2; // Minimum interactions for similarity calculation

  constructor() {
    this.userItemMatrix = new Map();
    this.itemItemMatrix = new Map();
    this.userUserMatrix = new Map();
  }

  /**
   * Build user-item interaction matrix
   */
  buildUserItemMatrix(data: TrainingData): void {
    this.userItemMatrix.clear();

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
        const currentScore = userMap.get(rating.product_id) || 0;
        const ratingScore = rating.rating / 5.0; // Normalize to 0-1
        userMap.set(rating.product_id, Math.max(currentScore, ratingScore));
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

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    const allKeys = new Set([...vec1.keys(), ...vec2.keys()]);
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    allKeys.forEach(key => {
      const val1 = vec1.get(key) || 0;
      const val2 = vec2.get(key) || 0;
      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    });

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Build item-item similarity matrix (Item-Based CF)
   */
  buildItemItemMatrix(data: TrainingData): void {
    this.itemItemMatrix.clear();
    const products = data.products;

    // Initialize matrix
    products.forEach(product => {
      this.itemItemMatrix.set(product.id, new Map());
    });

    // Calculate similarity between all pairs of products
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const product1 = products[i];
        const product2 = products[j];

        // Get users who interacted with both products
        const users1 = new Set<string>();
        const users2 = new Set<string>();

        this.userItemMatrix.forEach((itemMap, userId) => {
          if (itemMap.has(product1.id)) users1.add(userId);
          if (itemMap.has(product2.id)) users2.add(userId);
        });

        // Calculate similarity if enough common users
        const commonUsers = new Set([...users1].filter(u => users2.has(u)));
        if (commonUsers.size >= this.minInteractions) {
          const vec1 = new Map<string, number>();
          const vec2 = new Map<string, number>();

          commonUsers.forEach(userId => {
            const userMap = this.userItemMatrix.get(userId);
            if (userMap) {
              vec1.set(userId, userMap.get(product1.id) || 0);
              vec2.set(userId, userMap.get(product2.id) || 0);
            }
          });

          const similarity = this.cosineSimilarity(vec1, vec2);
          if (similarity > 0) {
            const map1 = this.itemItemMatrix.get(product1.id)!;
            const map2 = this.itemItemMatrix.get(product2.id)!;
            map1.set(product2.id, similarity);
            map2.set(product1.id, similarity);
          }
        }
      }
    }
  }

  /**
   * Build user-user similarity matrix (User-Based CF)
   */
  buildUserUserMatrix(data: TrainingData): void {
    this.userUserMatrix.clear();
    const users = data.users;

    // Initialize matrix
    users.forEach(user => {
      this.userUserMatrix.set(user.id, new Map());
    });

    // Calculate similarity between all pairs of users
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];

        const vec1 = this.userItemMatrix.get(user1.id) || new Map();
        const vec2 = this.userItemMatrix.get(user2.id) || new Map();

        // Calculate similarity if both users have interactions
        if (vec1.size >= this.minInteractions && vec2.size >= this.minInteractions) {
          const similarity = this.cosineSimilarity(vec1, vec2);
          if (similarity > 0) {
            const map1 = this.userUserMatrix.get(user1.id)!;
            const map2 = this.userUserMatrix.get(user2.id)!;
            map1.set(user2.id, similarity);
            map2.set(user1.id, similarity);
          }
        }
      }
    }
  }

  /**
   * Item-Based Collaborative Filtering
   */
  itemBasedRecommend(
    userId: string,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    const userItems = this.userItemMatrix.get(userId) || new Map();
    const recommendations: Recommendation[] = [];

    if (userItems.size === 0) {
      return []; // Cold start problem
    }

    // For each product user hasn't interacted with
    allProducts.forEach(product => {
      if (!userItems.has(product.id)) {
        let score = 0;
        let totalSimilarity = 0;

        // Sum up similarities with products user has interacted with
        userItems.forEach((rating, interactedProductId) => {
          const itemSimilarities = this.itemItemMatrix.get(interactedProductId);
          if (itemSimilarities) {
            const similarity = itemSimilarities.get(product.id) || 0;
            score += rating * similarity;
            totalSimilarity += Math.abs(similarity);
          }
        });

        if (totalSimilarity > 0) {
          const finalScore = score / totalSimilarity;
          recommendations.push({
            productId: product.id,
            score: finalScore,
            reason: 'Users with similar preferences also liked this',
            model: 'collaborative',
          });
        }
      }
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * User-Based Collaborative Filtering
   */
  userBasedRecommend(
    userId: string,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    const userSimilarities = this.userUserMatrix.get(userId) || new Map();
    const userItems = this.userItemMatrix.get(userId) || new Map();
    const recommendations: Recommendation[] = [];

    if (userSimilarities.size === 0 || userItems.size === 0) {
      return []; // Cold start problem
    }

    // Get top similar users
    const topSimilarUsers = Array.from(userSimilarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Calculate scores for products
    const productScores = new Map<string, { score: number; totalSimilarity: number }>();

    topSimilarUsers.forEach(([similarUserId, similarity]) => {
      const similarUserItems = this.userItemMatrix.get(similarUserId) || new Map();
      
      similarUserItems.forEach((rating, productId) => {
        if (!userItems.has(productId)) {
          const current = productScores.get(productId) || { score: 0, totalSimilarity: 0 };
          current.score += rating * similarity;
          current.totalSimilarity += Math.abs(similarity);
          productScores.set(productId, current);
        }
      });
    });

    // Convert to recommendations
    productScores.forEach((value, productId) => {
      if (value.totalSimilarity > 0) {
        recommendations.push({
          productId,
          score: value.score / value.totalSimilarity,
          reason: 'Similar users liked this',
          model: 'collaborative',
        });
      }
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Hybrid recommendation (combines item-based and user-based)
   */
  hybridRecommend(
    userId: string,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    const itemBased = this.itemBasedRecommend(userId, allProducts, topN * 2);
    const userBased = this.userBasedRecommend(userId, allProducts, topN * 2);

    // Combine and deduplicate
    const combined = new Map<string, Recommendation>();

    itemBased.forEach(rec => {
      const existing = combined.get(rec.productId);
      if (existing) {
        existing.score = (existing.score + rec.score) / 2;
      } else {
        combined.set(rec.productId, { ...rec });
      }
    });

    userBased.forEach(rec => {
      const existing = combined.get(rec.productId);
      if (existing) {
        existing.score = (existing.score + rec.score) / 2;
        existing.reason = 'Combined collaborative filtering';
      } else {
        combined.set(rec.productId, { ...rec });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Train the model
   */
  train(data: TrainingData): void {
    this.buildUserItemMatrix(data);
    this.buildItemItemMatrix(data);
    this.buildUserUserMatrix(data);
  }

  /**
   * Get model state for saving
   */
  getState(): any {
    return {
      userItemMatrix: Array.from(this.userItemMatrix.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      itemItemMatrix: Array.from(this.itemItemMatrix.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      userUserMatrix: Array.from(this.userUserMatrix.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
    };
  }

  /**
   * Load model state
   */
  loadState(state: any): void {
    this.userItemMatrix = new Map(
      state.userItemMatrix.map(([k, v]: [string, [string, number][]]) => [k, new Map(v)])
    );
    this.itemItemMatrix = new Map(
      state.itemItemMatrix.map(([k, v]: [string, [string, number][]]) => [k, new Map(v)])
    );
    this.userUserMatrix = new Map(
      state.userUserMatrix.map(([k, v]: [string, [string, number][]]) => [k, new Map(v)])
    );
  }
}















