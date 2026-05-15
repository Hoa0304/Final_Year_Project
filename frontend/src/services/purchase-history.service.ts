import api from '../config/api';

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  productDescription?: string;
  productPrice: number;
  productImageUrl?: string;
  productCategory?: string;
  quantity: number;
  totalAmount: number;
  purchasedAt: string;
}

export async function getPurchaseHistory(limit = 50, offset = 0): Promise<Purchase[]> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await api.get<{ purchases: Purchase[] }>(
    `/purchase-history?${params.toString()}`
  );
  return response.data.purchases;
}

