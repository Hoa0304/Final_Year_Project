/**
 * Mô hình lọc dựa trên nội dung
 * 
 * Đề xuất sản phẩm dựa trên độ tương đồng với các sản phẩm người dùng đã thích/mua.
 * Sử dụng TF-IDF cho các đặc trưng văn bản và độ tương đồng cosine để so khớp.
 */

import { Matrix } from 'ml-matrix';
import natural from 'natural';
import { Product, UserProfile, Recommendation, ContentFeatures } from './types';

export class ContentBasedModel {
  private productFeatures: Map<string, ContentFeatures>;
  private tfidf: natural.TfIdf;
  private productVectors: Map<string, number[]>;
  private featureWeights: {
    category: number;
    price: number;
    description: number;
    rating: number;
  };

  constructor() {
    this.productFeatures = new Map();
    this.tfidf = new natural.TfIdf();
    this.productVectors = new Map();
    this.featureWeights = {
      category: 0.3,
      price: 0.2,
      description: 0.3,
      rating: 0.2,
    };
  }

  /**
   * Trích xuất các đặc trưng từ sản phẩm
   */
  extractFeatures(products: Product[]): Map<string, ContentFeatures> {
    const features = new Map<string, ContentFeatures>();

    // Tính toán khoảng giá
    const prices = products.map(p => p.price).filter(p => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    products.forEach(product => {
      // Trích xuất từ khóa từ mô tả
      const description = (product.description || product.name || '').toLowerCase();
      const tokenizer = new natural.WordTokenizer();
      const tokens = tokenizer.tokenize(description) || [];
      const keywords = tokens.filter(token => token.length > 2);

      // Xác định khoảng giá
      let priceRangeCategory: 'low' | 'medium' | 'high' = 'medium';
      if (priceRange > 0) {
        const pricePercentile = (product.price - minPrice) / priceRange;
        if (pricePercentile < 0.33) priceRangeCategory = 'low';
        else if (pricePercentile > 0.67) priceRangeCategory = 'high';
      }

      features.set(product.id, {
        productId: product.id,
        features: {
          category: product.category || 'Other',
          price: product.price,
          priceRange: priceRangeCategory,
          description: description,
          keywords: keywords,
          averageRating: product.averageRating || 0,
          totalRatings: product.totalRatings || 0,
        },
      });
    });

    return features;
  }

  /**
   * Xây dựng vector TF-IDF cho sản phẩm
   */
  buildTFIDFVectors(products: Product[]): void {
    // Thêm tất cả mô tả sản phẩm vào TF-IDF
    products.forEach(product => {
      const text = `${product.name} ${product.description || ''} ${product.category || ''}`.toLowerCase();
      this.tfidf.addDocument(text);
    });

    // Tạo vector cho mỗi sản phẩm
    products.forEach((product, index) => {
      const vector: number[] = [];
      const text = `${product.name} ${product.description || ''} ${product.category || ''}`.toLowerCase();
      
      // Lấy điểm số TF-IDF
      this.tfidf.listTerms(index).forEach(term => {
        vector.push(term.tfidf);
      });

      // Chuẩn hóa vector
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = magnitude > 0 
        ? vector.map(val => val / magnitude)
        : vector;

      this.productVectors.set(product.id, normalizedVector);
    });
  }

  /**
   * Tính toán độ tương đồng cosine giữa hai vector
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Tính toán độ tương đồng đặc trưng giữa hai sản phẩm
   */
  featureSimilarity(features1: ContentFeatures, features2: ContentFeatures): number {
    let similarity = 0;
    let totalWeight = 0;

    const f1 = features1.features;
    const f2 = features2.features;

    // Độ tương đồng danh mục
    if (f1.category === f2.category) {
      similarity += this.featureWeights.category;
    }
    totalWeight += this.featureWeights.category;

    // Độ tương đồng giá cả (khoảng cách nghịch đảo)
    const priceDiff = Math.abs(f1.price - f2.price);
    const maxPrice = Math.max(f1.price, f2.price);
    const priceSimilarity = maxPrice > 0 ? 1 - (priceDiff / maxPrice) : 0;
    similarity += priceSimilarity * this.featureWeights.price;
    totalWeight += this.featureWeights.price;

    // Độ tương đồng mô tả (TF-IDF)
    const vec1 = this.productVectors.get(features1.productId) || [];
    const vec2 = this.productVectors.get(features2.productId) || [];
    const descSimilarity = this.cosineSimilarity(vec1, vec2);
    similarity += descSimilarity * this.featureWeights.description;
    totalWeight += this.featureWeights.description;

    // Độ tương đồng xếp hạng
    if (f1.averageRating && f2.averageRating) {
      const ratingDiff = Math.abs(f1.averageRating - f2.averageRating);
      const ratingSimilarity = 1 - (ratingDiff / 5); // Xếp hạng tối đa là 5
      similarity += ratingSimilarity * this.featureWeights.rating;
    }
    totalWeight += this.featureWeights.rating;

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  /**
   * Huấn luyện mô hình
   */
  train(products: Product[]): void {
    this.productFeatures = this.extractFeatures(products);
    this.buildTFIDFVectors(products);
  }

  /**
   * Nhận đề xuất cho người dùng
   */
  recommend(
    userProfile: UserProfile,
    allProducts: Product[],
    topN: number = 10
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const userProductIds = new Set(
      userProfile.purchaseHistory.map(p => p.product_id)
    );

    // Lấy các sản phẩm người dùng ưa thích
    const userProducts = allProducts.filter(p => userProductIds.has(p.id));

    if (userProducts.length === 0) {
      // Khởi động nguội: đề xuất sản phẩm phổ biến
      return allProducts
        .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        .slice(0, topN)
        .map(p => ({
          productId: p.id,
          score: 0.5,
          reason: 'Sản phẩm phổ biến',
          model: 'content-based' as const,
        }));
    }

    // Tính toán điểm số tương đồng
    const candidateProducts = allProducts.filter(p => !userProductIds.has(p.id));

    candidateProducts.forEach(candidate => {
      let totalSimilarity = 0;
      let count = 0;

      userProducts.forEach(userProduct => {
        const features1 = this.productFeatures.get(userProduct.id);
        const features2 = this.productFeatures.get(candidate.id);

        if (features1 && features2) {
          const similarity = this.featureSimilarity(features1, features2);
          totalSimilarity += similarity;
          count++;
        }
      });

      if (count > 0) {
        const avgSimilarity = totalSimilarity / count;
        recommendations.push({
          productId: candidate.id,
          score: avgSimilarity,
          reason: `Tương tự như các sản phẩm bạn đã mua`,
          model: 'content-based',
        });
      }
    });

    // Sắp xếp theo điểm số và trả về top N
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Lấy trạng thái mô hình để lưu
   */
  getState(): any {
    return {
      productFeatures: Array.from(this.productFeatures.entries()),
      productVectors: Array.from(this.productVectors.entries()),
      featureWeights: this.featureWeights,
    };
  }

  /**
   * Tải trạng thái mô hình
   */
  loadState(state: any): void {
    this.productFeatures = new Map(state.productFeatures);
    this.productVectors = new Map(state.productVectors);
    this.featureWeights = state.featureWeights;
  }
}















