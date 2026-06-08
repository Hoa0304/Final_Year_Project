import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification, isNotificationUnread, getNotificationIcon, getNotificationColor } from '../services/notification.service';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  onDelete?: () => void;
}

export default function NotificationItem({
  notification,
  onPress,
  onDelete,
}: NotificationItemProps) {
  const unread = isNotificationUnread(notification);
  const icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.priority);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        unread && styles.unreadContainer,
        unread && { borderLeftColor: color }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, unread && styles.unreadTitle]}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.time}>
            {formatTime(notification.created_at)}
          </Text>
        </View>
        {unread && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
      </View>
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#64748B" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  unreadContainer: {
    backgroundColor: '#1E293B60',
    borderLeftWidth: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '800',
  },
  message: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: '#64748B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 5,
    marginLeft: 6,
  },
});




















