import React, { useState } from 'react';
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
import { OrderStatus, getStatusLabel, getStatusColor } from '../../services/order.service';

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function AdminOrdersScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const { data: response, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminOrders', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/orders', { params });
      return res.data;
    },
  });

  const orders = response?.orders || [];

  const renderOrderItem = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Ionicons name="receipt-outline" size={16} color="#94A3B8" />
            <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{item.client?.full_name || item.client?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoColRight}>
            <Text style={styles.infoLabel}>Vendor</Text>
            <Text style={styles.infoValue}>{item.vendor?.full_name || item.vendor?.email || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.productRow}>
          <Ionicons name="cube-outline" size={16} color="#64748B" />
          <Text style={styles.productName} numberOfLines={1}>{item.products?.name}</Text>
          <Text style={styles.quantityText}>x{item.quantity}</Text>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-US')}
          </Text>
          <View style={styles.priceContainer}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.priceVnd}>
                {Math.round(item.original_price_coins).toLocaleString('en-US')} VND
              </Text>
              {item.price_coins > 0 && (
                <Text style={{ fontSize: 11, color: '#F59E0B', marginTop: 2 }}>
                  (Used {Math.round(item.price_coins).toLocaleString('en-US')} coins)
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1E1B4B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Management</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterBtn, filter === item.value && styles.filterBtnActive]}
              onPress={() => setFilter(item.value as any)}
            >
              <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Order List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={64} color="#334155" />
          <Text style={styles.emptyText}>No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
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
  filterContainer: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  filterBtnActive: { backgroundColor: '#6366F120', borderColor: '#6366F1' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  filterTextActive: { color: '#6366F1' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { color: '#64748B', fontSize: 16 },
  listContainer: { padding: 16, gap: 12, paddingBottom: 40 },
  orderCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  orderIdContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderId: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  infoCol: { flex: 1 },
  infoColRight: { flex: 1, alignItems: 'flex-end' },
  infoLabel: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#E2E8F0' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: '#1E293B', padding: 10, borderRadius: 8 },
  productName: { flex: 1, fontSize: 13, color: '#CBD5E1' },
  quantityText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#64748B' },
  priceContainer: { flexDirection: 'row', alignItems: 'center' },
  priceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceCoins: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  priceVnd: { fontSize: 15, fontWeight: '700', color: '#10B981' },
});
