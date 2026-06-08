import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../config/api';

interface AdminVendorStat {
  id: string;
  full_name: string;
  email: string;
  totalProducts: number;
  totalOrders: number;
  deliveredOrders: number;
  revenueCoins: number;
  revenueVnd: number;
  subscriptionPlan: string;
}

export default function AdminVendorStatsScreen() {
  const navigation = useNavigation<any>();

  const { data: vendors, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminVendorStats'],
    queryFn: async () => {
      const res = await api.get('/vendor/admin/vendor-stats');
      return res.data.vendors as AdminVendorStat[];
    },
  });

  const renderVendorItem = ({ item }: { item: AdminVendorStat }) => (
    <View style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <View style={styles.vendorAvatar}>
          <Text style={styles.avatarText}>{item.full_name?.charAt(0).toUpperCase() || 'V'}</Text>
        </View>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>{item.full_name || 'Vendor'}</Text>
          <Text style={styles.vendorEmail}>{item.email}</Text>
        </View>
        <View style={[
          styles.planBadge,
          item.subscriptionPlan === 'Premium' && styles.planPremium,
          item.subscriptionPlan === 'Pro' && styles.planPro,
          item.subscriptionPlan === 'Basic' && styles.planBasic,
        ]}>
          <Text style={[
            styles.planText,
            item.subscriptionPlan === 'Premium' && styles.planTextPremium,
            item.subscriptionPlan === 'Pro' && styles.planTextPro,
            item.subscriptionPlan === 'Basic' && styles.planTextBasic,
          ]}>
            {item.subscriptionPlan}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Ionicons name="cube-outline" size={18} color="#94A3B8" />
          <Text style={styles.statValue}>{item.totalProducts}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="cart-outline" size={18} color="#94A3B8" />
          <Text style={styles.statValue}>{item.totalOrders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="checkmark-done-circle-outline" size={18} color="#10B981" />
          <Text style={[styles.statValue, { color: '#10B981' }]}>{item.deliveredOrders}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      <View style={styles.revenueContainer}>
        <View style={styles.revenueItem}>
          <Text style={styles.revenueLabel}>VND Revenue:</Text>
          <Text style={styles.revenueVnd}>{Math.round(item.revenueVnd).toLocaleString('en-US')} VND</Text>
        </View>
        <View style={styles.revenueItem}>
          <Text style={styles.revenueLabel}>Coin Discount Offset:</Text>
          <Text style={styles.revenueCoin}>{Math.round(item.revenueCoins).toLocaleString('en-US')} coins</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1E1B4B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Stats</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* List */}
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : vendors?.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="people-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>No vendors found</Text>
          </View>
        ) : (
          <FlatList
            data={vendors}
            keyExtractor={(item) => item.id}
            renderItem={renderVendorItem}
            contentContainerStyle={styles.listContainer}
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#94A3B8', fontSize: 14 },
  emptyText: { color: '#64748B', fontSize: 16 },
  listContainer: { padding: 16, gap: 16, paddingBottom: 40 },
  vendorCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  vendorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  vendorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366F120', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#6366F1' },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  vendorEmail: { fontSize: 13, color: '#94A3B8' },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#334155' },
  planPremium: { backgroundColor: '#F59E0B20' },
  planPro: { backgroundColor: '#8B5CF620' },
  planBasic: { backgroundColor: '#3B82F620' },
  planText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  planTextPremium: { color: '#F59E0B' },
  planTextPro: { color: '#8B5CF6' },
  planTextBasic: { color: '#3B82F6' },
  statsGrid: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#334155' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#F8FAFC', marginVertical: 4 },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  revenueContainer: { gap: 8 },
  revenueItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 13, color: '#94A3B8' },
  revenueVnd: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  revenueCoin: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
});
