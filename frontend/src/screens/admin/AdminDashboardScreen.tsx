import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: stats, refetch: refetchStats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.get('/admin/users/stats');
      return response.data;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['adminProductsCount'],
    queryFn: async () => {
      const res = await api.get('/admin/products');
      return res.data;
    },
  });

  const { data: tasksData } = useQuery({
    queryKey: ['adminTasksCount'],
    queryFn: async () => {
      const res = await api.get('/admin/tasks');
      return res.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats()]);
    setRefreshing(false);
  };

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  const totalProducts = productsData?.products?.length || 0;
  const activeProducts = productsData?.products?.filter((p: any) => p.is_active)?.length || 0;
  const totalTasks = tasksData?.tasks?.length || 0;
  const activeTasks = tasksData?.tasks?.filter((t: any) => t.is_active)?.length || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
      <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.adminName}>{user?.fullName || user?.email || 'Admin'}</Text>
            </View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={24} color="#FF3B30" />
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
      </View>

        {/* Main Stats Grid */}
      <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{formatNumber(stats?.totalUsers || 0)}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
          </View>

          <View style={[styles.statCard, styles.successCard]}>
            <View style={[styles.statIconContainer, styles.successIcon]}>
              <Ionicons name="swap-horizontal" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{formatNumber(stats?.totalTransactions || 0)}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.warningCard]}>
            <View style={[styles.statIconContainer, styles.warningIcon]}>
              <Ionicons name="wallet" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{formatCurrency(stats?.totalBalance || 0)}</Text>
              <Text style={styles.statLabel}>Total Balance</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.infoCard]}>
            <View style={[styles.statIconContainer, styles.infoIcon]}>
              <Ionicons name="trending-up" size={28} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{formatCurrency(stats?.averageBalance || 0)}</Text>
              <Text style={styles.statLabel}>Avg Balance</Text>
            </View>
          </View>
        </View>

        {/* Secondary Stats */}
        <View style={styles.secondarySection}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          
          <View style={styles.secondaryStatsContainer}>
            <View style={styles.secondaryCard}>
              <View style={styles.secondaryCardHeader}>
                <Ionicons name="cube" size={20} color="#007AFF" />
                <Text style={styles.secondaryCardTitle}>Products</Text>
              </View>
              <View style={styles.secondaryCardBody}>
                <Text style={styles.secondaryCardValue}>{totalProducts}</Text>
                <Text style={styles.secondaryCardSubtext}>
                  {activeProducts} active
                </Text>
              </View>
            </View>

            <View style={styles.secondaryCard}>
              <View style={styles.secondaryCardHeader}>
                <Ionicons name="list" size={20} color="#34C759" />
                <Text style={styles.secondaryCardTitle}>Tasks</Text>
              </View>
              <View style={styles.secondaryCardBody}>
                <Text style={styles.secondaryCardValue}>{totalTasks}</Text>
                <Text style={styles.secondaryCardSubtext}>
                  {activeTasks} active
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Info Cards */}
        <View style={styles.quickInfoSection}>
          <View style={styles.quickInfoCard}>
            <Ionicons name="time-outline" size={24} color="#FF9500" />
            <View style={styles.quickInfoContent}>
              <Text style={styles.quickInfoLabel}>System Status</Text>
              <Text style={styles.quickInfoValue}>All Systems Operational</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          </View>

          <View style={styles.quickInfoCard}>
            <Ionicons name="stats-chart-outline" size={24} color="#007AFF" />
            <View style={styles.quickInfoContent}>
              <Text style={styles.quickInfoLabel}>Platform Health</Text>
              <Text style={styles.quickInfoValue}>Excellent</Text>
            </View>
            <Ionicons name="trending-up" size={24} color="#34C759" />
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
        )}
    </ScrollView>
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
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  adminBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  infoCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#5AC8FA',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  successIcon: {
    backgroundColor: '#34C759',
  },
  warningIcon: {
    backgroundColor: '#FF9500',
  },
  infoIcon: {
    backgroundColor: '#5AC8FA',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  secondarySection: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  secondaryStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  secondaryCardBody: {
    alignItems: 'flex-start',
  },
  secondaryCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  secondaryCardSubtext: {
    fontSize: 12,
    color: '#999',
  },
  quickInfoSection: {
    padding: 16,
    paddingTop: 8,
  },
  quickInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  quickInfoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  quickInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
