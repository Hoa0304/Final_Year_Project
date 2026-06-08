import React, { useState } from 'react';
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

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
    await refetchStats();
    setRefreshing(false);
  };

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => await logout() },
    ]);
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  const totalProducts = productsData?.products?.length || 0;
  const activeProducts = productsData?.products?.filter((p: any) => p.is_active)?.length || 0;
  const totalTasks = tasksData?.tasks?.length || 0;
  const activeTasks = tasksData?.tasks?.filter((t: any) => t.is_active)?.length || 0;

  // Mock data for charts
  const revenueData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [120, 150, 180, 220, 170, 250, 310] }],
  };

  const usersData = {
    labels: ['Vendor', 'Client'],
    datasets: [{ data: [35, 120] }],
  };

  const chartConfig = {
    backgroundGradientFrom: '#0F172A',
    backgroundGradientTo: '#0F172A',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#818CF8' },
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1E1B4B', '#0F172A']} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={24} color="#6366F1" />
          </View>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.adminName}>{user?.fullName || user?.email || 'Administrator'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* Main Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="people" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{formatNumber(stats?.totalUsers || 0)}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="swap-horizontal" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{formatNumber(stats?.totalTransactions || 0)}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="wallet" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{formatNumber(stats?.totalBalance || 0)}</Text>
              <Text style={styles.statLabel}>Total Balance</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="cube" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{totalProducts}</Text>
              <Text style={styles.statLabel}>Products ({activeProducts} active)</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue last 7 days</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={revenueData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Users</Text>
          <View style={styles.chartCard}>
            <BarChart
              data={usersData}
              width={screenWidth - 32}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              }}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </View>
        </View>

        {/* Quick Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.quickInfoCard}>
            <Ionicons name="server-outline" size={24} color="#10B981" />
            <View style={styles.quickInfoContent}>
              <Text style={styles.quickInfoLabel}>Server</Text>
              <Text style={styles.quickInfoValue}>Running normally</Text>
            </View>
            <View style={styles.statusDot} />
          </View>

          <View style={styles.quickInfoCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#3B82F6" />
            <View style={styles.quickInfoContent}>
              <Text style={styles.quickInfoLabel}>Security</Text>
              <Text style={styles.quickInfoValue}>Secure</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1 },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 13, color: '#94A3B8', marginBottom: 2 },
  adminName: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  adminBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#6366F120', justifyContent: 'center', alignItems: 'center' },
  logoutButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  statCardHalf: { width: '50%', padding: 6 },
  statCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', alignItems: 'flex-start' },
  statIconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  section: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 },
  chartCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center' },
  chart: { borderRadius: 12, marginVertical: 8 },
  quickInfoCard: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#1E293B' },
  quickInfoContent: { flex: 1, marginLeft: 12 },
  quickInfoLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  quickInfoValue: { fontSize: 14, fontWeight: '600', color: '#E2E8F0' },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
});
