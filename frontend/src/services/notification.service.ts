import api from '../config/api';

export type NotificationType =
  | 'order_placed'
  | 'order_completed'
  | 'order_cancelled'
  | 'task_completed'
  | 'task_reward_claimed'
  | 'stock_price_alert'
  | 'balance_low'
  | 'balance_high'
  | 'product_discount'
  | 'new_product'
  | 'system_announcement'
  | 'game_completed'
  | 'game_reward'
  | 'rating_received'
  | 'cart_reminder';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  scheduled_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  notification_history?: NotificationHistory[];
}

export interface NotificationHistory {
  id: string;
  notification_id: string;
  user_id: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'blocked';
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  notificationType: NotificationType;
  enabled: boolean;
  channels: NotificationChannel[];
  minPriority: NotificationPriority;
  maxPerDay: number;
  cooldownMinutes: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

/**
 * Get user notifications
 */
export async function getNotifications(
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const response = await api.get<NotificationsResponse>('/notifications', {
    params: { limit, offset, unreadOnly },
  });
  return response.data.notifications;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
  return response.data.count;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await api.put(`/notifications/${notificationId}/read`);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await api.put('/notifications/read-all');
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await api.delete(`/notifications/${notificationId}`);
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences[]> {
  const response = await api.get<{ preferences: NotificationPreferences[] }>(
    '/notifications/preferences'
  );
  return response.data.preferences;
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>[]
): Promise<void> {
  await api.put('/notifications/preferences', { preferences });
}

/**
 * Check if notification is unread
 */
export function isNotificationUnread(notification: Notification): boolean {
  // If no history, consider it unread (new notification)
  if (!notification.notification_history || notification.notification_history.length === 0) {
    return true;
  }

  // Check if any in_app notification is delivered but not read
  const inAppHistory = notification.notification_history.find(
    (h) => h.channel === 'in_app'
  );

  // If no in_app history, consider it unread
  if (!inAppHistory) {
    return true;
  }

  // Check if delivered, sent, or pending but not read
  return (
    (inAppHistory.status === 'delivered' ||
      inAppHistory.status === 'sent' ||
      inAppHistory.status === 'pending') &&
    !inAppHistory.read_at
  );
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    order_placed: 'cart',
    order_completed: 'checkmark-circle',
    order_cancelled: 'close-circle',
    task_completed: 'checkmark-done',
    task_reward_claimed: 'gift',
    stock_price_alert: 'trending-up',
    balance_low: 'warning',
    balance_high: 'trending-up',
    product_discount: 'pricetag',
    new_product: 'cube',
    system_announcement: 'megaphone',
    game_completed: 'trophy',
    game_reward: 'star',
    rating_received: 'star',
    cart_reminder: 'cart',
  };

  return iconMap[type] || 'notifications';
}

/**
 * Get notification color based on priority
 */
export function getNotificationColor(priority: NotificationPriority): string {
  const colorMap: Record<NotificationPriority, string> = {
    urgent: '#FF3B30',
    high: '#FF9500',
    medium: '#007AFF',
    low: '#8E8E93',
  };

  return colorMap[priority] || '#8E8E93';
}

