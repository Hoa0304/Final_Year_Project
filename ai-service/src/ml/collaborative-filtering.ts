/**
 * Mô hình lọc cộng tác
 * 
 * Đề xuất sản phẩm dựa trên sở thích của những người dùng tương tự.
 * Triển khai cả Lọc cộng tác dựa trên người dùng và dựa trên mặt hàng.
 */

import { Matrix } from 'ml-matrix';
import { Product, UserProfile, Purchase, Rating, Recommendation, TrainingData } from './types';

export class CollaborativeFilteringModel {
  private userItemMatrix: Map<string, Map<string, number>>; // userId -> productId -> xếp hạng/điểm
  private itemItemMatrix: Map<string, Map<string, number>>; // productId -> productId -> độ tương đồng
  private userUserMatrix: Map<string, Map<string, number>>; // userId -> userId -> độ tương đồng
  private minInteractions: number = 2; // Số lượng tương tác tối thiểu để tính toán độ tương đồng

  constructor() {
    this.userItemMatrix = new Map();
    this.itemItemMatrix = new Map();
    this.userUserMatrix = new Map();
  }

  /**
   * Xây dựng ma trận tương tác người dùng - mặt hàng
   */
  buildUserItemMatrix(data: TrainingData): void {
    this.userItemMatrix.clear();

    // Khởi tạo ma trận
    data.users.forEach(user => {
      this.userItemMatrix.set(user.id, new Map());
    });

    // Thêm lượt mua hàng (trọng số: 1.0)
    data.purchases.forEach(purchase => {
      const userMap = this.userItemMatrix.get(purchase.user_id);
      if (userMap) {
        const currentScore = userMap.get(purchase.product_id) || 0;
        userMap.set(purchase.product_id, currentScore + 1.0);
      }
    });

    // Thêm xếp hạng (trọng số: rating / 5)
    data.ratings.forEach(rating => {
      const userMap = this.userItemMatrix.get(rating.user_id);
      if (userMap) {
        const currentScore = userMap.get(rating.product_id) || 0;
        const ratingScore = rating.rating / 5.0; // Chuẩn hóa về 0-1
        userMap.set(rating.product_id, Math.max(currentScore, ratingScore));
      }
    });

    // Chuẩn hóa điểm số cho mỗi người dùng
    this.userItemMatrix.forEach((itemMap, userId) => {
      const maxScore = Math.max(...Array.from(itemMap.values()), 1);
      itemMap.forEach((score, productId) => {
        itemMap.set(productId, score / maxScore);
      });
    });
  }

  /**
   * Tính toán độ tương đồng cosine giữa hai vector
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
   * Xây dựng ma trận độ tương đồng mặt hàng - mặt hàng (Lọc cộng tác dựa trên mặt hàng)
   */
  buildItemItemMatrix(data: TrainingData): void {
    this.itemItemMatrix.clear();
    const products = data.products;

    // Khởi tạo ma trận
    products.forEach(product => {
      this.itemItemMatrix.set(product.id, new Map());
    });

    // Tính toán độ tương đồng giữa tất cả các cặp sản phẩm
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const product1 = products[i];
        const product2 = products[j];

        // Lấy người dùng đã tương tác với cả hai sản phẩm
        const users1 = new Set<string>();
        const users2 = new Set<string>();

        this.userItemMatrix.forEach((itemMap, userId) => {
          if (itemMap.has(product1.id)) users1.add(userId);
          if (itemMap.has(product2.id)) users2.add(userId);
        });

        // Tính độ tương đồng nếu có đủ người dùng chung
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
   * Xây dựng ma trận độ tương đồng người dùng - người dùng (Lọc cộng tác dựa trên người dùng)
   */
  buildUserUserMatrix(data: TrainingData): void {
    this.userUserMatrix.clear();
    const users = data.users;

    // Khởi tạo ma trận
    users.forEach(user => {
      this.userUserMatrix.set(user.id, new Map());
    });

    // Tính toán độ tương đồng giữa tất cả các cặp người dùng
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];

        const vec1 = this.userItemMatrix.get(user1.id) || new Map();
        const vec2 = this.userItemMatrix.get(user2.id) || new Map();

        // Tính độ tương đồng nếu cả hai người dùng đều có tương tác
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
   * Lọc cộng tác dựa trên mặt hàng
   */
  itemBasedRecommend(
    userId: string,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    const userItems = this.userItemMatrix.get(userId) || new Map();
    const recommendations: Recommendation[] = [];

    if (userItems.size === 0) {
      return []; // Vấn đề khởi động nguội
    }

    // Đối với mỗi sản phẩm người dùng chưa tương tác
    allProducts.forEach(product => {
      if (!userItems.has(product.id)) {
        let score = 0;
        let totalSimilarity = 0;

        // Tổng hợp độ tương đồng với các sản phẩm người dùng đã tương tác
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
            reason: 'Những người dùng có sở thích tương tự cũng thích cái này',
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
   * Lọc cộng tác dựa trên người dùng
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
      return []; // Vấn đề khởi động nguội
    }

    // Lấy top người dùng tương tự
    const topSimilarUsers = Array.from(userSimilarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Tính điểm cho các sản phẩm
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

    // Chuyển đổi thành đề xuất
    productScores.forEach((value, productId) => {
      if (value.totalSimilarity > 0) {
        recommendations.push({
          productId,
          score: value.score / value.totalSimilarity,
          reason: 'Những người dùng tương tự đã thích cái này',
          model: 'collaborative',
        });
      }
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Đề xuất lai (kết hợp dựa trên mặt hàng và dựa trên người dùng)
   */
  hybridRecommend(
    userId: string,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    const itemBased = this.itemBasedRecommend(userId, allProducts, topN * 2);
    const userBased = this.userBasedRecommend(userId, allProducts, topN * 2);

    // Kết hợp và loại bỏ trùng lặp
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
        existing.reason = 'Lọc cộng tác kết hợp';
      } else {
        combined.set(rec.productId, { ...rec });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Huấn luyện mô hình
   */
  train(data: TrainingData): void {
    this.buildUserItemMatrix(data);
    this.buildItemItemMatrix(data);
    this.buildUserUserMatrix(data);
  }

  /**
   * Lấy trạng thái mô hình để lưu
   */
  getState(): any {
    return {
      userItemMatrix: Array.from(this.userItemMatrix.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      itemItemMatrix: Array.from(this.itemItemMatrix.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      userUserMatrix: Array.from(this.userUserMatrix.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
    };
  }

  /**
   * Tải trạng thái mô hình
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















