/**
 * Hệ thống đề xuất lai
 * 
 * Kết hợp Lọc dựa trên nội dung và Lọc cộng tác để có các đề xuất tốt hơn.
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
   * Huấn luyện cả hai mô hình
   */
  train(data: TrainingData): void {
    console.log('Training Content-Based model...');
    this.contentBased.train(data.products);
    
    console.log('Training Collaborative Filtering model...');
    this.collaborative.train(data);
    
    console.log('Training completed!');
  }

  /**
   * Nhận các đề xuất lai
   */
  recommend(
    userId: string,
    userProfile: UserProfile,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    // Lấy đề xuất từ cả hai mô hình
    const contentRecs = this.contentBased.recommend(userProfile, allProducts, topN * 2);
    const collaborativeRecs = this.collaborative.hybridRecommend(userId, allProducts, topN * 2);

    // Kết hợp các đề xuất
    const combined = new Map<string, Recommendation>();

    // Thêm các đề xuất dựa trên nội dung
    contentRecs.forEach(rec => {
      const score = rec.score * this.weights.contentBased;
      combined.set(rec.productId, {
        ...rec,
        score,
        model: 'hybrid',
        reason: 'Dựa trên độ tương đồng của sản phẩm',
      });
    });

    // Thêm các đề xuất lọc cộng tác
    collaborativeRecs.forEach(rec => {
      const existing = combined.get(rec.productId);
      if (existing) {
        // Kết hợp điểm số
        existing.score = existing.score + (rec.score * this.weights.collaborative);
        existing.reason = 'Kết hợp: độ tương đồng sản phẩm + sở thích người dùng';
      } else {
        combined.set(rec.productId, {
          ...rec,
          score: rec.score * this.weights.collaborative,
          model: 'hybrid',
          reason: 'Những người dùng có sở thích tương tự đã thích sản phẩm này',
        });
      }
    });

    // Xử lý khởi động nguội: nếu không có đề xuất, chỉ sử dụng dựa trên nội dung
    if (combined.size === 0) {
      if (contentRecs.length > 0) {
        return contentRecs.slice(0, topN);
      }
      // Nếu vẫn không có đề xuất, trả về mảng rỗng (sẽ được xử lý bởi dự phòng)
      return [];
    }

    // Sắp xếp theo điểm kết hợp và trả về top N
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(rec => ({
        ...rec,
        score: Math.min(1.0, rec.score), // Chuẩn hóa về 0-1
      }));
  }

  /**
   * Nhận đề xuất kèm theo chi tiết mô hình
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
   * Lấy trạng thái mô hình để lưu
   */
  getState(): any {
    return {
      contentBased: this.contentBased.getState(),
      collaborative: this.collaborative.getState(),
      weights: this.weights,
    };
  }

  /**
   * Tải trạng thái mô hình
   */
  loadState(state: any): void {
    this.contentBased.loadState(state.contentBased);
    this.collaborative.loadState(state.collaborative);
    this.weights = state.weights;
  }
}

