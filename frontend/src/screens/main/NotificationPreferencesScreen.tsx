import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../services/notification.service';

const NOTIFICATION_TYPES: NotificationType[] = [
  'order_placed',
  'order_completed',
  'order_cancelled',
  'task_completed',
  'task_reward_claimed',
  'stock_price_alert',
  'balance_low',
  'balance_high',
  'product_discount',
  'new_product',
  'system_announcement',
  'game_completed',
  'game_reward',
  'rating_received',
  'cart_reminder',
];

const CHANNELS: NotificationChannel[] = ['in_app', 'push', 'email', 'sms'];
const PRIORITIES: NotificationPriority[] = ['low', 'medium', 'high', 'urgent'];

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  order_placed: 'Order Placed',
  order_completed: 'Order Completed',
  order_cancelled: 'Order Cancelled',
  task_completed: 'Task Completed',
  task_reward_claimed: 'Task Reward Claimed',
  stock_price_alert: 'Stock Price Alert',
  balance_low: 'Low Balance',
  balance_high: 'High Balance',
  product_discount: 'Product Discount',
  new_product: 'New Product',
  system_announcement: 'System Announcement',
  game_completed: 'Game Completed',
  game_reward: 'Game Reward',
  rating_received: 'Rating Received',
  cart_reminder: 'Cart Reminder',
};

export default function NotificationPreferencesScreen() {
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<NotificationType | null>(null);

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: getNotificationPreferences,
  });

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      Alert.alert('Success', 'Preferences updated successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update preferences');
    },
  });

  const getPreference = (type: NotificationType): NotificationPreferences | null => {
    return preferences.find((p) => p.notificationType === type) || null;
  };

  const handleToggleEnabled = (type: NotificationType) => {
    const pref = getPreference(type);
    const updatedPreferences: Partial<NotificationPreferences>[] = [
      {
        notificationType: type,
        enabled: !pref?.enabled,
        channels: pref?.channels || ['in_app'],
        minPriority: pref?.minPriority || 'low',
        maxPerDay: pref?.maxPerDay ?? 10,
        cooldownMinutes: pref?.cooldownMinutes ?? 0,
        quietHoursStart: pref?.quietHoursStart,
        quietHoursEnd: pref?.quietHoursEnd,
      },
    ];

    updateMutation.mutate(updatedPreferences);
  };

  const handleUpdatePreference = (type: NotificationType, updates: Partial<NotificationPreferences>) => {
    const pref = getPreference(type);
    const updatedPreferences: Partial<NotificationPreferences>[] = [
      {
        notificationType: type,
        enabled: pref?.enabled ?? true,
        channels: pref?.channels || ['in_app'],
        minPriority: pref?.minPriority || 'low',
        maxPerDay: pref?.maxPerDay ?? 10,
        cooldownMinutes: pref?.cooldownMinutes ?? 0,
        quietHoursStart: pref?.quietHoursStart,
        quietHoursEnd: pref?.quietHoursEnd,
        ...updates,
      },
    ];

    updateMutation.mutate(updatedPreferences);
    setEditingType(null);
  };

  const renderPreferenceRow = (type: NotificationType) => {
    const pref = getPreference(type);
    const enabled = pref?.enabled ?? true;
    const isEditing = editingType === type;

    return (
      <View key={type} style={styles.preferenceRow}>
        <View style={styles.preferenceHeader}>
          <View style={styles.preferenceTitleContainer}>
            <Text style={styles.preferenceTitle}>{NOTIFICATION_LABELS[type]}</Text>
            {!enabled && <Text style={styles.disabledLabel}>(Disabled)</Text>}
          </View>
          <Switch
            value={enabled}
            onValueChange={() => handleToggleEnabled(type)}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>

        {enabled && (
          <View style={styles.preferenceDetails}>
            {isEditing ? (
              <View style={styles.editingContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Max per day:</Text>
                  <TextInput
                    style={styles.detailInput}
                    value={pref?.maxPerDay?.toString() || '10'}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      handleUpdatePreference(type, { maxPerDay: value });
                    }}
                  />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cooldown (minutes):</Text>
                  <TextInput
                    style={styles.detailInput}
                    value={pref?.cooldownMinutes?.toString() || '0'}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      handleUpdatePreference(type, { cooldownMinutes: value });
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setEditingType(null)}
                >
                  <Text style={styles.saveButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailText}>
                  Max: {pref?.maxPerDay ?? 10}/day | Cooldown: {pref?.cooldownMinutes ?? 0}min
                </Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingType(type)}
                >
                  <Ionicons name="settings-outline" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        {NOTIFICATION_TYPES.map(renderPreferenceRow)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  preferenceRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  disabledLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  preferenceDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  editButton: {
    padding: 5,
  },
  editingContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  detailInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 8,
    width: 100,
    fontSize: 14,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

