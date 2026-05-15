import api from '../config/api';

export interface CartItem {
  id: string;
  productId: string;
  productName?: string;
  productDescription?: string;
  productPrice?: number;
  productImageUrl?: string;
  productCategory?: string;
  stockQuantity?: number;
  quantity: number;
  subtotal: number;
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    category?: string;
    stockQuantity: number;
    isActive: boolean;
    discountPercentage?: number | null;
    created_by?: string;
  };
}

export interface CartResponse {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export async function getCart(): Promise<CartResponse> {
  const response = await api.get<CartResponse>('/cart');
  return response.data;
}

export async function addToCart(productId: string, quantity = 1): Promise<CartItem> {
  const response = await api.post<{ item: CartItem; message: string }>('/cart', {
    productId,
    quantity
  });
  return response.data.item;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartItem> {
  const response = await api.put<{ item: CartItem; message: string }>(`/cart/${itemId}`, {
    quantity
  });
  return response.data.item;
}

export async function removeFromCart(itemId: string): Promise<void> {
  await api.delete(`/cart/${itemId}`);
}

export async function clearCart(): Promise<void> {
  await api.delete('/cart');
}

