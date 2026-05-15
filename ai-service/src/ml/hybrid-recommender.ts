/**
 * Hybrid Recommendation System
 * 
 * Combines Content-Based and Collaborative Filtering for better recommendations.
 */

import { ContentBasedModel } from './content-based';
import { CollaborativeFilteringModel } from './collaborative-filtering';
import { Product, UserProfile, Recommendation, TrainingData } from './types';

export class HybridRecommender {
  private contentBased: ContentBasedModel;
  private collaborative: CollaborativeFilteringModel;
  private weights: {
    contentBased: number;
    collaborative: number;
  };

  constructor(
    contentWeight: number = 0.4,
    collaborativeWeight: number = 0.6
  ) {
    this.contentBased = new ContentBasedModel();
    this.collaborative = new CollaborativeFilteringModel();
    this.weights = {
      contentBased: contentWeight,
      collaborative: collaborativeWeight,
    };
  }

  /**
   * Train both models
   */
  train(data: TrainingData): void {
    console.log('Training Content-Based model...');
    this.contentBased.train(data.products);
    
    console.log('Training Collaborative Filtering model...');
    this.collaborative.train(data);
    
    console.log('Training completed!');
  }

  /**
   * Get hybrid recommendations
   */
  recommend(
    userId: string,
    userProfile: UserProfile,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    // Get recommendations from both models
    const contentRecs = this.contentBased.recommend(userProfile, allProducts, topN * 2);
    const collaborativeRecs = this.collaborative.hybridRecommend(userId, allProducts, topN * 2);

    // Combine recommendations
    const combined = new Map<string, Recommendation>();

    // Add content-based recommendations
    contentRecs.forEach(rec => {
      const score = rec.score * this.weights.contentBased;
      combined.set(rec.productId, {
        ...rec,
        score,
        model: 'hybrid',
        reason: 'Based on product similarity',
      });
    });

    // Add collaborative recommendations
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
          reason: 'Users with similar preferences liked this',
        });
      }
    });

    // Handle cold start: if no recommendations, use content-based only
    if (combined.size === 0) {
      if (contentRecs.length > 0) {
        return contentRecs.slice(0, topN);
      }
      // If still no recommendations, return empty array (will be handled by fallback)
      return [];
    }

    // Sort by combined score and return top N
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(rec => ({
        ...rec,
        score: Math.min(1.0, rec.score), // Normalize to 0-1
      }));
  }

  /**
   * Get recommendations with model breakdown
   */
  recommendWithBreakdown(
    userId: string,
    userProfile: UserProfile,
    allProducts: Product[],
    topN: number = 10
  ): {
    recommendations: Recommendation[];
    breakdown: {
      contentBased: number;
      collaborative: number;
      hybrid: number;
    };
  } {
    const recommendations = this.recommend(userId, userProfile, allProducts, topN);
    
    const breakdown = {
      contentBased: recommendations.filter(r => r.reason.includes('product similarity')).length,
      collaborative: recommendations.filter(r => r.reason.includes('similar preferences')).length,
      hybrid: recommendations.filter(r => r.reason.includes('Combined')).length,
    };

    return { recommendations, breakdown };
  }

  /**
   * Get model state for saving
   */
  getState(): any {
    return {
      contentBased: this.contentBased.getState(),
      collaborative: this.collaborative.getState(),
      weights: this.weights,
    };
  }

  /**
   * Load model state
   */
  loadState(state: any): void {
    this.contentBased.loadState(state.contentBased);
    this.collaborative.loadState(state.collaborative);
    this.weights = state.weights;
  }
}

