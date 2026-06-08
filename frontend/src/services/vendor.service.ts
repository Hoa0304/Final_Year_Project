import api from '../config/api';
import { Product } from './product.service';

export interface Vendor {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  productCount?: number;
}

export interface VendorInfo {
  vendor: Vendor;
  products: Product[];
  productCount: number;
}

/**
 * Get vendor information and products (public)
 */
export async function getVendorInfo(vendorId: string): Promise<VendorInfo> {
  const response = await api.get(`/vendors/${vendorId}`);
  return response.data;
}

/**
 * Search vendors
 */
export async function searchVendors(search?: string, limit?: number, offset?: number): Promise<Vendor[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));

  const response = await api.get(`/vendors/search?${params.toString()}`);
  return response.data.vendors || [];
}

/**
 * Get vendors by IDs
 */
export async function getVendorsByIds(vendorIds: string[]): Promise<Vendor[]> {
  if (!vendorIds || vendorIds.length === 0) {
    return [];
  }
  
  const params = new URLSearchParams();
  params.append('ids', vendorIds.join(','));
  
  const response = await api.get(`/vendors/by-ids?${params.toString()}`);
  return response.data.vendors || [];
}

export interface VendorAnalyticsData {
  analytics: {
    totalProducts: number;
    productsThisWeek: number;
    productLimit: number;
    canPostProduct: boolean;
    totalOrders: number;
    deliveredOrders: number;
    pendingOrders: number;
    totalRevenueCoins: number;
    totalRevenueVnd: number;
    byStatus: Record<string, number>;
  };
  subscription: {
    packageName: string;
    productLimit: number;
    expiresAt?: string;
    status: string;
  };
  period: number;
}

/**
 * Get vendor analytics (dashboard)
 */
export async function getVendorAnalytics(period: number = 30): Promise<VendorAnalyticsData> {
  const response = await api.get('/vendor/analytics', { params: { period } });
  return response.data;
}

