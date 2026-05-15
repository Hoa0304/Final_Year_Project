import api from '../config/api';

export interface Recommendation {
  id?: string;
  title: string;
  description: string;
  actionType: 'product' | 'stock' | 'task';
  actionId?: string;
  confidence: number;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  source?: string;
}

/**
 * Get spending recommendations
 */
export async function getSpendingRecommendations(): Promise<Recommendation[]> {
  const response = await api.get<RecommendationsResponse>('/recommendations/spending');
  return response.data.recommendations;
}

/**
 * Get investing recommendations
 */
export async function getInvestingRecommendations(): Promise<Recommendation[]> {
  const response = await api.get<RecommendationsResponse>('/recommendations/investing');
  return response.data.recommendations;
}

/**
 * ML Recommendation interface
 */
export interface MLRecommendation {
  productId: string;
  score: number;
  reason: string;
  model: 'hybrid' | 'content-based' | 'collaborative' | 'rule-based';
}

export interface MLRecommendationsResponse {
  recommendations: MLRecommendation[];
  source: 'ml-model' | 'rule-based';
  model?: string;
  count?: number;
}

/**
 * Get ML-based product recommendations
 * Uses trained ML models for personalized product recommendations
 */
export async function getMLRecommendations(
  modelType: 'hybrid' | 'content-based' | 'collaborative' = 'hybrid',
  topN: number = 10
): Promise<MLRecommendationsResponse> {
  const response = await api.get<MLRecommendationsResponse>(
    `/recommendations/ml?modelType=${modelType}&topN=${topN}`
  );
  return response.data;
}


