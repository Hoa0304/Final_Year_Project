import api from '../config/api';

export interface CoinPackage {
  id: string;
  name: string;
  description: string;
  coins: number;
  price_vnd: number;
  is_active: boolean;
}

export interface VendorPackage {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  product_limit: number;
  category_limit: number;
  priority_display: boolean;
  badge_vip: boolean;
  analytics_enabled: boolean;
  is_active: boolean;
}

export interface CreatePaymentParams {
  amount: number;
  method: string;
  packageId: string;
  referenceType: 'coin_package' | 'vendor_vip' | 'product_order';
}

export async function getCoinPackages(): Promise<CoinPackage[]> {
  const response = await api.get('/payment/packages');
  return response.data.packages;
}

export async function getVendorPackages(): Promise<VendorPackage[]> {
  const response = await api.get('/payment/vendor-packages');
  return response.data.packages;
}

export async function createPayment(params: CreatePaymentParams): Promise<{ payment: any, url: string }> {
  const response = await api.post('/payment/create', params);
  return response.data;
}
