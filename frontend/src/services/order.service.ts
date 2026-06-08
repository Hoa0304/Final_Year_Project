/**
 * Order Service - Frontend
 * Handles order creation, tracking, and management
 */
import api from '../config/api';

export type OrderStatus =
  | 'pending_payment'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'coin' | 'vnd';

export interface Order {
  id: string;
  user_id: string;
  vendor_id: string;
  product_id: string;
  quantity: number;
  payment_method: PaymentMethod;
  price_coins: number;
  price_vnd: number;
  original_price_coins: number;
  discount_applied: number;
  status: OrderStatus;
  estimated_delivery: string;
  delivered_at?: string;
  shipped_at?: string;
  paid_at?: string;
  delivery_address?: string;
  notes?: string;
  vendor_notes?: string;
  tracking_code?: string;
  late_compensation_voucher_id?: string;
  created_at: string;
  // Joins
  products?: {
    id: string;
    name: string;
    image_url?: string;
    price: number;
    category?: string;
    description?: string;
  };
  client?: { id: string; full_name?: string; email: string };
  vendor?: { id: string; full_name?: string; email: string };
  // Computed
  isLate?: boolean;
}

export interface CreateOrderParams {
  productId: string;
  quantity?: number;
  paymentMethod: PaymentMethod;
  addressText?: string;
  notes?: string;
  useCoins?: boolean;
}

export interface OrderAnalytics {
  totalOrders: number;
  byStatus: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  totalRevenueCoins: number;
  totalRevenueVnd: number;
  deliveredOrders: number;
  lateOrders: number;
}

/**
 * Create a new order (checkout)
 */
export async function createOrder(params: CreateOrderParams): Promise<{ order: Order; paymentInfo: any }> {
  const response = await api.post('/orders', {
    productId: params.productId,
    quantity: params.quantity || 1,
    paymentMethod: params.paymentMethod,
    addressText: params.addressText,
    notes: params.notes,
    useCoins: params.useCoins || false,
  });
  return response.data;
}

/**
 * Get current user's orders
 */
export async function getMyOrders(status?: OrderStatus): Promise<Order[]> {
  const params: any = {};
  if (status) params.status = status;
  const response = await api.get('/orders/my', { params });
  return response.data.orders || [];
}

/**
 * Get a single order by ID
 */
export async function getOrderById(id: string): Promise<Order> {
  const response = await api.get(`/orders/${id}`);
  return response.data.order;
}

/**
 * Get vendor orders (vendor view)
 */
export async function getVendorOrders(status?: OrderStatus): Promise<Order[]> {
  const params: any = {};
  if (status) params.status = status;
  const response = await api.get('/vendor/orders', { params });
  return response.data.orders || [];
}

/**
 * Update order status (vendor)
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  notes?: string,
  trackingCode?: string
): Promise<{ order: Order; lateCompensation: any }> {
  const response = await api.put(`/vendor/orders/${orderId}/status`, {
    status,
    notes,
    trackingCode,
  });
  return response.data;
}

/**
 * Mock VND payment (dev only)
 */
export async function mockVndPayment(orderId: string): Promise<any> {
  const response = await api.post('/orders/mock-vnd-payment', { orderId });
  return response.data;
}

/**
 * Get order analytics
 */
export async function getOrderAnalytics(period?: number): Promise<OrderAnalytics> {
  const response = await api.get('/orders/analytics', { params: { period } });
  return response.data.analytics;
}

/**
 * Get ETH/VND exchange rate
 */
export async function getEthRate(): Promise<{ rate: number; source: string }> {
  const response = await api.get('/payments/eth-rate');
  return response.data;
}

/**
 * Helper: Get label for order status
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending_payment: 'Pending Payment',
    processing: 'Processing',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Helper: Get color for order status
 */
export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending_payment: '#FF9500',
    processing: '#007AFF',
    shipped: '#5856D6',
    out_for_delivery: '#FF6B35',
    delivered: '#34C759',
    cancelled: '#FF3B30',
  };
  return colors[status] || '#999';
}

/**
 * Helper: Get progress percentage for order status
 */
export function getStatusProgress(status: OrderStatus): number {
  const progress: Record<OrderStatus, number> = {
    pending_payment: 0,
    processing: 25,
    shipped: 50,
    out_for_delivery: 75,
    delivered: 100,
    cancelled: 0,
  };
  return progress[status] || 0;
}

/**
 * Helper: Get next possible statuses for vendor to update to
 */
export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending_payment: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };
  return transitions[currentStatus] || [];
}
