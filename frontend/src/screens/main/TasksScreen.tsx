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

export default function TasksScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  const completeTaskMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: (data) => {
      // Invalidate notifications to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      Alert.alert('Success', `Task completed! You earned ${data.reward} coins.`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to complete task');
    },
  });

  function handleCompleteTask(taskId: string) {
    Alert.alert('Complete Task', 'Are you sure you want to complete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
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
        targetScreen = 'Games';
        break;
      case 'stocks':
        targetScreen = 'Stocks';
        break;
      case 'tasks':
        // Already on tasks screen, just scroll to top or show message
        Alert.alert('Info', 'Complete other tasks first to unlock this one!');
        return;
      default:
        console.log('Unknown action type:', actionType);
        Alert.alert('Error', 'Unknown action type');
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
            Alert.alert('Error', `Unable to navigate to ${targetScreen}. Please use the bottom tabs.`);
          }
        }
      }
    }
  }

  function renderTask({ item }: { item: Task }) {
    const isCompleted = item.userStatus === 'completed' || item.userStatus === 'claimed';
    const canComplete = item.canComplete ?? false;
    // Handle undefined actionType (convert to null)
    const actionType = item.actionType ?? null;

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, isCompleted && styles.statusBadgeCompleted]}>
            <Text style={[styles.statusText, isCompleted && styles.statusTextCompleted]}>
              {isCompleted ? 'Completed' : 'Available'}
            </Text>
          </View>
        </View>
        {item.description && <Text style={styles.taskDescription}>{item.description}</Text>}
        <View style={styles.taskFooter}>
          <View style={styles.rewardContainer}>
            <Ionicons name="cash" size={20} color="#FF9500" />
            <Text style={styles.rewardAmount}>{item.reward_amount.toFixed(2)} coins</Text>
          </View>
          {isCompleted ? (
            <TouchableOpacity style={styles.completeButtonDisabled} disabled>
              <Text style={styles.completeButtonText}>Completed</Text>
            </TouchableOpacity>
          ) : canComplete ? (
          <TouchableOpacity
              style={styles.completeButton}
            onPress={() => handleCompleteTask(item.id)}
              disabled={completeTaskMutation.isLoading}
          >
            {completeTaskMutation.isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
                <Text style={styles.completeButtonText}>Complete</Text>
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
                  Alert.alert('Info', 'This task does not require a specific action. Please complete the requirements manually.');
                }
              }}
            >
              <Ionicons name="arrow-forward" size={16} color="#007AFF" style={{ marginRight: 4 }} />
              <Text style={styles.doItButtonText}>Do it</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>Complete tasks to earn rewards!</Text>
        </View>
      </View>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks available</Text>
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
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 15,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  statusBadgeCompleted: {
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#fff',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9500',
    marginLeft: 5,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  doItButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doItButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

