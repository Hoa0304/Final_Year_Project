import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getNotifications, Notification, isNotificationUnread, getNotificationIcon, getNotificationColor } from '../services/notification.service';

const { width } = Dimensions.get('window');

interface NotificationToastProps {
  onPress?: (notification: Notification) => void;
  onDismiss?: () => void;
}

export default function NotificationToast({ onPress, onDismiss }: NotificationToastProps) {
  const [visibleNotification, setVisibleNotification] = useState<Notification | null>(null);
  const [slideAnim] = useState(new Animated.Value(-200));
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch latest notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(10, 0, false),
    refetchInterval: 2000, // Check every 2 seconds for new notifications
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Refetch more aggressively when component is mounted
  useEffect(() => {
    if (!mounted) return;
    
    // Refetch immediately on mount
    refetchNotifications();
    
    // Then refetch every 1 second to catch new notifications quickly
    const checkInterval = setInterval(() => {
      refetchNotifications();
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [mounted, refetchNotifications]);

  useEffect(() => {
    if (!mounted || !notifications || notifications.length === 0) return;

    // Sort notifications by created_at (newest first)
    const sortedNotifications = [...notifications].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Find the latest unread notification that we haven't shown yet
    const latestUnread = sortedNotifications.find((notif) => {
      const isUnread = isNotificationUnread(notif);
      const isNew = notif.id !== lastNotificationId;
      const isRecent = new Date().getTime() - new Date(notif.created_at).getTime() < 60000; // Within last minute
      return isUnread && isNew && isRecent;
    });

    if (latestUnread) {
      // Don't show if we're already showing this notification
      if (visibleNotification && visibleNotification.id === latestUnread.id) {
        return;
      }

      console.log('📬 Showing notification toast:', latestUnread.title, latestUnread.id);
      
      setVisibleNotification(latestUnread);
      setLastNotificationId(latestUnread.id);
      
      // Reset animation
      slideAnim.setValue(-200);
      
      // Animate in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notifications, lastNotificationId, visibleNotification, mounted, slideAnim]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisibleNotification(null);
      onDismiss?.();
    });
  };

  const handlePress = () => {
    if (visibleNotification) {
      onPress?.(visibleNotification);
      handleDismiss();
    }
  };

  if (!mounted || !visibleNotification) {
    return null;
  }

  const icon = getNotificationIcon(visibleNotification.type);
  const color = getNotificationColor(visibleNotification.priority);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {visibleNotification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {visibleNotification.message}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
    zIndex: 9999,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 5,
    marginLeft: 8,
  },
});

