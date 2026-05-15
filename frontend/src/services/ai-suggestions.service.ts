import api from '../config/api';

export interface ItemSuggestion {
  productId: string;
  productName: string;
  productPrice: number;
  productCategory?: string;
  productImageUrl?: string;
  reason: string;
  confidence: number;
}

export interface SuggestionsResponse {
  suggestions: ItemSuggestion[];
  source: string;
  basedOn?: {
    transactionCount: number;
    purchaseCount: number;
  };
}

export async function getItemSuggestions(limit = 10, excludeRecent = true): Promise<SuggestionsResponse> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('excludeRecent', excludeRecent.toString());

  const response = await api.get<SuggestionsResponse>(`/suggestions/items?${params.toString()}`);
  return response.data;
}

