/**
 * Notification Controller
 * 
 * Handles notification-related API endpoints
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  updateUserNotificationPreferences,
  getUserPreferences,
  NotificationData,
} from '../services/notification.service';

/**
 * Get user notifications
 * GET /api/notifications
 */
export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const { notifications, error } = await getUserNotifications(
      userId,
      limit,
      offset,
      unreadOnly
    );

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { notifications, error } = await getUserNotifications(userId, 1000, 0, true);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch unread count' });
    }

    // Count unread notifications
    const unreadCount = (notifications || []).filter((notif: any) => {
      const history = notif.notification_history || [];
      return history.some((h: any) => h.status === 'delivered' && !h.read_at);
    }).length;

    res.json({ count: unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await markNotificationAsRead(userId, id);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export async function markAllAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const success = await markAllNotificationsAsRead(userId);

    if (!success) {
      return res.status(500).json({ error: 'Failed to mark all as read' });
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export async function deleteNotificationHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await deleteNotification(userId, id);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 */
export async function getNotificationPreferences(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const preferences = await getUserPreferences(userId);

    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update user notification preferences
 * PUT /api/notifications/preferences
 */
export async function updateNotificationPreferences(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: 'Preferences must be an array' });
    }

    const success = await updateUserNotificationPreferences(userId, preferences);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Send notification (admin/system only)
 * POST /api/notifications/send
 */
export async function sendNotificationHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    // Only allow admins or system to send notifications directly
    // In production, this should be restricted to system/service accounts
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can send notifications directly' });
    }

    const { targetUserId, notificationData } = req.body;

    if (!targetUserId || !notificationData) {
      return res.status(400).json({ error: 'targetUserId and notificationData are required' });
    }

    const result = await sendNotification(targetUserId, notificationData as NotificationData);

    if (!result.success) {
      return res.status(400).json({
        error: result.reason || 'Failed to send notification',
        skipped: result.skipped,
      });
    }

    res.json({
      message: 'Notification sent successfully',
      notificationId: result.notificationId,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

