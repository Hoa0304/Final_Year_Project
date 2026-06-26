import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, completeTask, Task } from '../../services/task.service';
import { Ionicons } from '@expo/vector-icons';
import { translateTaskTitle, translateTaskDesc } from '../../utils/category.utils';

export default function TasksScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
    refetchInterval: 5000,
  });

  const completeTaskMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: (data) => {
      // Invalidate notifications to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      Alert.alert('Thành công', `Bạn đã nhận được ${Math.round(data.reward).toLocaleString('en-US')} Xu!`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể hoàn thành nhiệm vụ');
    },
  });

  function handleCompleteTask(taskId: string) {
    Alert.alert('Nhận thưởng', 'Bạn có chắc chắn muốn nhận thưởng cho nhiệm vụ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Nhận',
        onPress: () => completeTaskMutation.mutate(taskId),
      },
    ]);
  }

  function handleDoIt(actionType: string) {
    console.log('handleDoIt called with actionType:', actionType);

    // Navigate to the appropriate screen based on action type
    // Use CommonActions to navigate to tabs in the same Tab Navigator
    let targetScreen = '';

    switch (actionType) {
      case 'marketplace':
        targetScreen = 'Marketplace';
        break;
      case 'games':
        Alert.alert('Thông tin', 'Tính năng Game đã ngừng hoạt động.');
        return;
      case 'stocks':
        Alert.alert('Thông tin', 'Tính năng Chứng khoán đã ngừng hoạt động.');
        return;
      case 'tasks':
        // Already on tasks screen, just scroll to top or show message
        Alert.alert('Thông tin', 'Vui lòng hoàn thành các nhiệm vụ khác trước để mở khóa!');
        return;
      default:
        console.log('Unknown action type:', actionType);
        Alert.alert('Lỗi', 'Loại hành động không xác định');
        return;
    }

    if (targetScreen) {
      // Try to navigate using CommonActions (works for Tab Navigator)
      try {
        navigation.dispatch(
          CommonActions.navigate({
            name: targetScreen,
          })
        );
      } catch (error) {
        console.error('Navigation error with CommonActions:', error);
        // Fallback: try direct navigation
        try {
          (navigation as any).navigate(targetScreen);
        } catch (fallbackError) {
          console.error('Fallback navigation error:', fallbackError);
          // Last resort: try nested navigation
          try {
            (navigation as any).navigate('Main', { screen: targetScreen });
          } catch (nestedError) {
            console.error('Nested navigation error:', nestedError);
            Alert.alert('Lỗi', `Không thể chuyển đến ${targetScreen}. Vui lòng sử dụng thanh điều hướng.`);
          }
        }
      }
    }
  }

  function renderTask({ item }: { item: Task }) {
    const isCompleted = item.userStatus === 'completed' || item.userStatus === 'claimed';
    const canComplete = item.canComplete ?? false;
    const actionType = item.actionType ?? null;

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{translateTaskTitle(item.title)}</Text>
          <View style={[styles.statusBadge, isCompleted && styles.statusBadgeCompleted]}>
            <Text style={[styles.statusText, isCompleted && styles.statusTextCompleted]}>
              {isCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
            </Text>
          </View>
        </View>
        {item.description && <Text style={styles.taskDescription}>{translateTaskDesc(item.description)}</Text>}
        <View style={styles.taskFooter}>
          <View style={styles.rewardContainer}>
            <Ionicons name="logo-bitcoin" size={18} color="#F59E0B" />
            <Text style={styles.rewardAmount}>{Math.round(item.reward_amount).toLocaleString('vi-VN')} xu</Text>
          </View>
          {isCompleted ? (
            <View style={styles.completeButtonDisabled}>
              <Text style={styles.completeButtonTextDisabled}>Đã nhận</Text>
            </View>
          ) : canComplete ? (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteTask(item.id)}
              disabled={completeTaskMutation.isPending}
            >
              {completeTaskMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.completeButtonText}>Nhận thưởng</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.doItButton}
              onPress={() => {
                if (actionType) {
                  console.log('Do it pressed, actionType:', actionType);
                  handleDoIt(actionType);
                } else {
                  console.log('No actionType available for task:', item.title);
                  Alert.alert('Thông tin', 'Nhiệm vụ này không có liên kết trực tiếp. Vui lòng tự thực hiện.');
                }
              }}
            >
              <Text style={styles.doItButtonText}>Bắt đầu ngay</Text>
              <Ionicons name="chevron-forward" size={16} color="#818CF8" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const totalAvailableReward = tasks
    ?.filter((t) => t.userStatus !== 'completed' && t.userStatus !== 'claimed')
    .reduce((sum, t) => sum + t.reward_amount, 0) || 0;
  const completedCount = tasks?.filter((t) => t.userStatus === 'completed' || t.userStatus === 'claimed').length || 0;
  const totalCount = tasks?.length || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Thử thách kiếm xu</Text>
            <Text style={styles.subtitle}>Hoàn thành thử thách để nhận xu!</Text>
          </View>
        </View>

        {/* Hero stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="logo-bitcoin" size={22} color="#F59E0B" />
            <Text style={styles.statValue}>{Math.round(totalAvailableReward).toLocaleString('en-US')}</Text>
            <Text style={styles.statLabel}>Có sẵn</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.statValue}>{completedCount}/{totalCount}</Text>
            <Text style={styles.statLabel}>Đã nhận</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={22} color="#818CF8" />
            <Text style={styles.statValue}>{totalCount - completedCount}</Text>
            <Text style={styles.statLabel}>Còn lại</Text>
          </View>
        </View>

        <FlatList keyboardShouldPersistTaps="handled"
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || false}
              onRefresh={refetch}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={48} color="#475569" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Hiện chưa có thử thách nào</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#1E293B',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  taskCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    color: '#F8FAFC',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusText: {
    fontSize: 11,
    color: '#818CF8',
    fontWeight: 'bold',
  },
  statusTextCompleted: {
    color: '#10B981',
  },
  taskDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.4)',
    paddingTop: 14,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 6,
  },
  completeButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  completeButtonTextDisabled: {
    color: '#475569',
    fontSize: 14,
    fontWeight: 'bold',
  },
  doItButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  doItButtonText: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

