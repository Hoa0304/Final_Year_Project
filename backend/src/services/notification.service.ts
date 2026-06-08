/**
 * Notification Service
 * 
 * Smart notification system with filtering, prioritization, frequency control,
 * and user preference management
 */

import { supabase } from '../utils/supabase';

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
  | 'cart_reminder'
  | 'social_reply'
  | 'product_review';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'blocked';

export interface NotificationData {
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface UserNotificationPreferences {
  notificationType: NotificationType;
  enabled: boolean;
  channels: NotificationChannel[];
  minPriority: NotificationPriority;
  maxPerDay: number;
  cooldownMinutes: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  skipped?: boolean;
  reason?: string;
  historyIds?: string[];
}

/**
 * Priority mapping for notification types
 */
const NOTIFICATION_PRIORITY_MAP: Record<NotificationType, NotificationPriority> = {
  order_placed: 'medium',
  order_completed: 'high',
  order_cancelled: 'high',
  task_completed: 'medium',
  task_reward_claimed: 'high',
  stock_price_alert: 'low',
  balance_low: 'high',
  balance_high: 'low',
  product_discount: 'low',
  new_product: 'low',
  system_announcement: 'urgent',
  game_completed: 'low',
  game_reward: 'medium',
  rating_received: 'low',
  cart_reminder: 'low',
  social_reply: 'medium',
  product_review: 'high',
};

/**
 * Default channels for notification types
 */
const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannel[]> = {
  order_placed: ['in_app'],
  order_completed: ['in_app', 'push'],
  order_cancelled: ['in_app', 'push'],
  task_completed: ['in_app'],
  task_reward_claimed: ['in_app', 'push'],
  stock_price_alert: ['in_app'],
  balance_low: ['in_app', 'push', 'email'],
  balance_high: ['in_app'],
  product_discount: ['in_app'],
  new_product: ['in_app'],
  system_announcement: ['in_app', 'push', 'email'],
  game_completed: ['in_app'],
  game_reward: ['in_app', 'push'],
  rating_received: ['in_app'],
  cart_reminder: ['in_app'],
  social_reply: ['in_app'],
  product_review: ['in_app', 'push'],
};

/**
 * Check if user is active (not deleted)
 */
async function isUserActive(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  return !error && !!data;
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<Map<NotificationType, UserNotificationPreferences>> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching notification preferences:', error);
    return new Map();
  }

  const preferencesMap = new Map<NotificationType, UserNotificationPreferences>();

  if (data) {
    for (const pref of data) {
      preferencesMap.set(pref.notification_type as NotificationType, {
        notificationType: pref.notification_type as NotificationType,
        enabled: pref.enabled,
        channels: pref.channels as NotificationChannel[],
        minPriority: pref.min_priority as NotificationPriority,
        maxPerDay: pref.max_per_day,
        cooldownMinutes: pref.cooldown_minutes,
        quietHoursStart: pref.quiet_hours_start,
        quietHoursEnd: pref.quiet_hours_end,
      });
    }
  }

  return preferencesMap;
}

/**
 * Check if notification can be sent based on frequency rules
 */
async function canSendNotification(
  userId: string,
  notificationType: NotificationType,
  cooldownMinutes?: number
): Promise<{ canSend: boolean; reason?: string }> {
  // Check if user is active
  const userActive = await isUserActive(userId);
  if (!userActive) {
    return { canSend: false, reason: 'User account is inactive or deleted' };
  }

  // Get user preferences
  const preferences = await getUserNotificationPreferences(userId);
  const preference = preferences.get(notificationType);

  // If no preference exists, allow by default (but still check user is active)
  if (!preference) {
    return { canSend: true };
  }

  // Check if notification type is disabled
  if (!preference.enabled) {
    return { canSend: false, reason: 'Notification type is disabled by user' };
  }

  // Check quiet hours
  if (preference.quietHoursStart && preference.quietHoursEnd) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const start = preference.quietHoursStart;
    const end = preference.quietHoursEnd;

    if (start > end) {
      // Quiet hours span midnight
      if (currentTime >= start || currentTime <= end) {
        return { canSend: false, reason: 'Quiet hours active' };
      }
    } else {
      // Normal quiet hours
      if (currentTime >= start && currentTime <= end) {
        return { canSend: false, reason: 'Quiet hours active' };
      }
    }
  }

  // Check frequency limits
  const { data: frequency, error } = await supabase
    .from('notification_frequency_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which is OK
    console.error('Error checking frequency:', error);
    return { canSend: false, reason: 'Error checking frequency limits' };
  }

  if (frequency) {
    // Check daily limit
    if (frequency.count_today >= preference.maxPerDay) {
      return { canSend: false, reason: 'Daily notification limit reached' };
    }

    // Check cooldown period
    const effectiveCooldown = cooldownMinutes ?? preference.cooldownMinutes;
    if (effectiveCooldown > 0 && frequency.last_sent_at) {
      const lastSent = new Date(frequency.last_sent_at);
      const now = new Date();
      const minutesSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60);

      if (minutesSinceLastSent < effectiveCooldown) {
        return {
          canSend: false,
          reason: `Cooldown period active (${Math.ceil(effectiveCooldown - minutesSinceLastSent)} minutes remaining)`,
        };
      }
    }
  }

  return { canSend: true };
}

/**
 * Record notification sent for frequency tracking
 */
async function recordNotificationSent(
  userId: string,
  notificationType: NotificationType
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase.rpc('record_notification_sent', {
    p_user_id: userId,
    p_notification_type: notificationType,
  });

  if (error) {
    console.error('Error recording notification sent:', error);
    // Try manual insert/update as fallback
    const { data: existing } = await supabase
      .from('notification_frequency_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .eq('date', today)
      .single();

    if (existing) {
      await supabase
        .from('notification_frequency_tracking')
        .update({
          count_today: existing.count_today + 1,
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('notification_frequency_tracking').insert({
        user_id: userId,
        notification_type: notificationType,
        last_sent_at: new Date().toISOString(),
        count_today: 1,
        date: today,
      });
    }
  }
}

/**
 * Filter and deduplicate notifications
 */
function filterNotifications(
  notifications: NotificationData[]
): NotificationData[] {
  // Group by user and type
  const seen = new Map<string, NotificationData>();

  for (const notif of notifications) {
    // For now, we'll just return all notifications
    // In a more advanced system, we could deduplicate similar notifications
    // or merge them
    seen.set(`${notif.type}-${JSON.stringify(notif.data)}`, notif);
  }

  return Array.from(seen.values());
}

/**
 * Prioritize notifications
 */
function prioritizeNotifications(
  notifications: NotificationData[]
): NotificationData[] {
  const priorityOrder: Record<NotificationPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return notifications.sort((a, b) => {
    const priorityA = a.priority || NOTIFICATION_PRIORITY_MAP[a.type] || 'medium';
    const priorityB = b.priority || NOTIFICATION_PRIORITY_MAP[b.type] || 'medium';
    return priorityOrder[priorityB] - priorityOrder[priorityA];
  });
}

/**
 * Send a notification to a user
 */
export async function sendNotification(
  userId: string,
  notificationData: NotificationData
): Promise<NotificationResult> {
  try {
    // Check if notification can be sent
    const { canSend, reason } = await canSendNotification(
      userId,
      notificationData.type
    );

    if (!canSend) {
      return {
        success: false,
        skipped: true,
        reason: reason || 'Notification blocked by rules',
      };
    }

    // Get user preferences
    const preferences = await getUserNotificationPreferences(userId);
    const preference = preferences.get(notificationData.type);

    // Determine channels
    const channels =
      notificationData.channels ||
      preference?.channels ||
      DEFAULT_CHANNELS[notificationData.type] ||
      ['in_app'];

    // Determine priority
    const priority =
      notificationData.priority || NOTIFICATION_PRIORITY_MAP[notificationData.type] || 'medium';

    // Check priority filter
    if (preference) {
      const priorityOrder: Record<NotificationPriority, number> = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      if (priorityOrder[priority] < priorityOrder[preference.minPriority]) {
        return {
          success: false,
          skipped: true,
          reason: `Priority ${priority} is below minimum ${preference.minPriority}`,
        };
      }
    }

    // Create notification record
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notificationData.type,
        priority: priority,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        channels: channels,
        scheduled_at: notificationData.scheduledAt?.toISOString() || null,
        expires_at: notificationData.expiresAt?.toISOString() || null,
      })
      .select()
      .single();

    if (notifError || !notification) {
      console.error('Error creating notification:', notifError);
      return {
        success: false,
        reason: 'Failed to create notification record',
      };
    }

    // Create notification history for each channel
    const historyIds: string[] = [];
    const now = new Date().toISOString();

    for (const channel of channels) {
      const { data: history, error: historyError } = await supabase
        .from('notification_history')
        .insert({
          notification_id: notification.id,
          user_id: userId,
          channel: channel,
          status: 'pending',
          sent_at: now,
        })
        .select()
        .single();

      if (!historyError && history) {
        historyIds.push(history.id);

        // Simulate delivery (in a real system, this would call actual push/email/SMS services)
        // For now, we'll mark in_app as delivered immediately
        if (channel === 'in_app') {
          await supabase
            .from('notification_history')
            .update({
              status: 'delivered',
              delivered_at: now,
            })
            .eq('id', history.id);
        }
      }
    }

    // Record notification sent for frequency tracking
    await recordNotificationSent(userId, notificationData.type);

    return {
      success: true,
      notificationId: notification.id,
      historyIds,
    };
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      reason: error.message || 'Unknown error',
    };
  }
}

/**
 * Send notifications to multiple users (batch)
 */
export async function sendNotificationsToUsers(
  userIds: string[],
  notificationData: NotificationData
): Promise<Map<string, NotificationResult>> {
  const results = new Map<string, NotificationResult>();

  // Filter and prioritize
  const filtered = filterNotifications([notificationData]);
  const prioritized = prioritizeNotifications(filtered);

  // Send to each user (with concurrency control)
  const batchSize = 10; // Process 10 users at a time
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const batchPromises = batch.map((userId) =>
      sendNotification(userId, prioritized[0]).then((result) => {
        results.set(userId, result);
      })
    );

    await Promise.all(batchPromises);
  }

  return results;
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
) {
  let query = supabase
    .from('notifications')
    .select('*, notification_history(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq('notification_history.status', 'delivered');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return { notifications: [], error };
  }

  return { notifications: data || [], error: null };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('notification_history')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('notification_id', notificationId)
    .eq('user_id', userId)
    .eq('channel', 'in_app');

  return !error;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notification_history')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('channel', 'in_app')
    .eq('status', 'delivered');

  return !error;
}

/**
 * Delete notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: Partial<UserNotificationPreferences>[]
): Promise<boolean> {
  try {
    for (const pref of preferences) {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          notification_type: pref.notificationType!,
          enabled: pref.enabled ?? true,
          channels: pref.channels || ['in_app'],
          min_priority: pref.minPriority || 'low',
          max_per_day: pref.maxPerDay ?? 10,
          cooldown_minutes: pref.cooldownMinutes ?? 0,
          quiet_hours_start: pref.quietHoursStart || null,
          quiet_hours_end: pref.quietHoursEnd || null,
        });

      if (error) {
        console.error('Error updating preferences:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating preferences:', error);
    return false;
  }
}

/**
 * Get user notification preferences
 */
export async function getUserPreferences(userId: string) {
  const preferences = await getUserNotificationPreferences(userId);
  return Array.from(preferences.values());
}







