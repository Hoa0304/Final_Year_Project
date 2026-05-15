import api from '../config/api';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  created_by?: string; // Vendor ID who created this product
  random_voucher_ids?: string[]; // Array of voucher IDs that can be randomly issued after purchase
  averageRating?: number; // Average rating (0-5)
  totalRatings?: number; // Total number of ratings
  discount_percentage?: number | null; // Discount percentage (0-100), null means no discount
  discountedPrice?: number; // Calculated discounted price (from backend)
  hasDiscount?: boolean; // Whether product has an active discount
}

export interface ProductsResponse {
  products: Product[];
}

export interface PurchaseResponse {
  message: string;
  order: {
    id: string;
    product: string;
    quantity: number;
    totalAmount: number;
    status: string;
  };
}

/**
 * Get all products with filters and sorting
 */
export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
  limit?: number;
  offset?: number;
}

export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  const params: any = {};
  
  if (filters?.category) params.category = filters.category;
  if (filters?.search) params.search = filters.search;
  if (filters?.minPrice !== undefined) params.minPrice = filters.minPrice;
  if (filters?.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
  if (filters?.inStock !== undefined) params.inStock = filters.inStock.toString();
  if (filters?.sortBy) params.sortBy = filters.sortBy;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.offset) params.offset = filters.offset;

  const response = await api.get<ProductsResponse>('/products', { params });
  return response.data.products;
}

/**
 * Get all unique categories from products
 */
export async function getCategories(): Promise<string[]> {
  const response = await api.get<{ categories: string[] }>('/products/categories');
  return response.data.categories;
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<Product> {
  const response = await api.get<{ product: Product }>(`/products/${id}`);
  return response.data.product;
}

/**
 * Purchase a product
 * React Query v5 passes the entire mutation variables object as the first parameter
 */
export async function purchaseProduct(variables: { productId: string; quantity?: number; voucherCode?: string; voucherId?: string }): Promise<PurchaseResponse> {
  const { productId, quantity = 1, voucherCode, voucherId } = variables;
  console.log('🛒 Purchasing product:', { productId, quantity, voucherCode, voucherId });
  const response = await api.post<PurchaseResponse>('/products/purchase', {
    productId,
    quantity,
    ...(voucherCode && { voucher_code: voucherCode }),
    ...(voucherId && { voucher_id: voucherId }),
  });
  console.log('✅ Purchase successful:', response.data);
  return response.data;
}

// Rating interfaces
export interface ProductRating {
  id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface ProductRatingsResponse {
  productId: string;
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  ratings: ProductRating[];
}

export interface SubmitRatingRequest {
  rating: number;
  reviewText?: string;
}

export interface SubmitRatingResponse {
  message: string;
  rating: ProductRating;
}

/**
 * Get all ratings for a product
 */
export async function getProductRatings(productId: string): Promise<ProductRatingsResponse> {
  const response = await api.get<ProductRatingsResponse>(`/products/${productId}/ratings`);
  return response.data;
}

/**
 * Get user's rating for a product (if exists)
 * Also returns whether user has purchased the product
 */
export async function getUserRating(productId: string): Promise<{ rating: ProductRating | null; hasPurchased: boolean }> {
  const response = await api.get<{ rating: ProductRating | null; hasPurchased: boolean }>(`/products/${productId}/ratings/my`);
  return response.data;
}

/**
 * Submit a rating for a product
 */
export async function submitRating(variables: {
  productId: string;
  rating: number;
  reviewText?: string;
}): Promise<SubmitRatingResponse> {
  const { productId, rating, reviewText } = variables;
  const response = await api.post<SubmitRatingResponse>(`/products/${productId}/ratings`, {
    rating,
    reviewText,
  });
  return response.data;
}

/**
 * Update user's rating
 */
export async function updateRating(variables: {
  productId: string;
  ratingId: string;
  rating: number;
  reviewText?: string;
}): Promise<SubmitRatingResponse> {
  const { productId, ratingId, rating, reviewText } = variables;
  const response = await api.put<SubmitRatingResponse>(`/products/${productId}/ratings/${ratingId}`, {
    rating,
    reviewText,
  });
  return response.data;
}

/**
 * Delete user's rating
 */
export async function deleteRating(productId: string, ratingId: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/products/${productId}/ratings/${ratingId}`);
  return response.data;
}

/**
 * Set discount percentage for a product (vendor only)
 */
export async function setProductDiscount(
  productId: string,
  discountPercentage: number | null
): Promise<{ message: string; product: Product }> {
  const response = await api.put<{ message: string; product: Product }>(
    `/vendor/products/${productId}/discount`,
    { discountPercentage }
  );
  return response.data;
}

