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
  ActivityIndicator,
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

const NOTIFICATION_LABELS: Record<string, string> = {
  system_alert: 'Cảnh báo hệ thống',
  system_maintenance: 'Bảo trì hệ thống',
  order_completed: 'Đơn hàng hoàn tất',
  task_completed: 'Nhiệm vụ hoàn tất',
  task_reward_claimed: 'Đã nhận thưởng nhiệm vụ',
  admin_message: 'Tin nhắn từ Admin',
  expense_warning: 'Cảnh báo chi tiêu',
  budget_alert: 'Cảnh báo ngân sách',
  savings_milestone: 'Cột mốc tiết kiệm',
  price_drop: 'Giảm giá sản phẩm',
  restock: 'Sản phẩm có hàng lại',
  game_completed: 'Hoàn thành trò chơi',
  order_placed: 'Đơn hàng đã đặt',
  order_cancelled: 'Đơn hàng đã hủy',
  stock_price_alert: 'Cảnh báo giá cổ phiếu',
  balance_low: 'Số dư thấp',
  balance_high: 'Số dư cao',
  product_discount: 'Giảm giá sản phẩm',
  new_product: 'Sản phẩm mới',
  system_announcement: 'Thông báo hệ thống',
  game_reward: 'Phần thưởng trò chơi',
  rating_received: 'Đã nhận đánh giá',
  cart_reminder: 'Nhắc nhở giỏ hàng',
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
      Alert.alert('Thành công', 'Preferences updated successfully');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Failed to update preferences');
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
            trackColor={{ false: '#1E293B', true: '#10B981' }}
            thumbColor={enabled ? '#F8FAFC' : '#64748B'}
          />
        </View>

        {enabled && (
          <View style={styles.preferenceDetails}>
            {isEditing ? (
              <View style={styles.editingContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tối đa mỗi ngày:</Text>
                  <TextInput
                    style={styles.detailInput}
                    value={pref?.maxPerDay?.toString() || '10'}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      handleUpdatePreference(type, { maxPerDay: value });
                    }}
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian chờ (phút):</Text>
                  <TextInput
                    style={styles.detailInput}
                    value={pref?.cooldownMinutes?.toString() || '0'}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      handleUpdatePreference(type, { cooldownMinutes: value });
                    }}
                    placeholderTextColor="#64748B"
                  />
                </View>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setEditingType(null)}
                >
                  <Text style={styles.saveButtonText}>Xong</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailText}>
                  Max: {pref?.maxPerDay ?? 10}/day | Cooldown: {pref?.cooldownMinutes ?? 0} min
                </Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingType(type)}
                >
                  <Ionicons name="settings-outline" size={18} color="#10B981" />
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
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={{ color: '#94A3B8', marginTop: 12 }}>Đang tải thiết lập...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài đặt thông báo</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Các loại thông báo hệ thống</Text>
        {NOTIFICATION_TYPES.map(renderPreferenceRow)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preferenceRow: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  disabledLabel: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
    fontWeight: '600',
  },
  preferenceDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  editButton: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  editingContainer: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  detailInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 80,
    fontSize: 13,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

