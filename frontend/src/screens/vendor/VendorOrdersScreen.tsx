import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getVendorOrders, OrderStatus, getStatusLabel, getStatusColor } from '../../services/order.service';
import { LinearGradient } from 'expo-linear-gradient';

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function VendorOrdersScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vendorOrders', filter],
    queryFn: () => getVendorOrders(filter === 'all' ? undefined : filter as OrderStatus),
  });

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

        <View style={styles.productRow}>
          {item.products?.image_url ? (
            <Image source={{ uri: item.products.image_url }} style={styles.productImg} />
          ) : (
            <View style={styles.productImgPlaceholder}>
              <Ionicons name="cube" size={24} color="#334155" />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.products?.name}</Text>
            <Text style={styles.quantityText}>x{item.quantity}</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.clientInfo}>
            <Ionicons name="person-circle-outline" size={16} color="#64748B" />
            <Text style={styles.clientName}>{item.client?.full_name || item.client?.email || 'Customer'}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Revenue:</Text>
            <View style={styles.priceValueRow}>
              <Ionicons name="logo-bitcoin" size={14} color="#F59E0B" />
              <Text style={styles.priceCoins}>
                {Math.round(item.original_price_coins * 0.9).toLocaleString('vi-VN')} xu
              </Text>
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
      <LinearGradient colors={['#0F172A', '#020617']} style={styles.header}>
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
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : orders?.length === 0 ? (
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
  filterBtnActive: { backgroundColor: '#10B98120', borderColor: '#10B981' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  filterTextActive: { color: '#10B981' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { color: '#64748B', fontSize: 16 },
  listContainer: { padding: 16, gap: 12, paddingBottom: 40 },
  orderCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderIdContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderId: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  productRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1E293B' },
  productImg: { width: 50, height: 50, borderRadius: 8 },
  productImgPlaceholder: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 4 },
  quantityText: { fontSize: 13, color: '#94A3B8' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  clientInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontSize: 13, color: '#64748B' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceLabel: { fontSize: 12, color: '#64748B' },
  priceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceCoins: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  priceVnd: { fontSize: 15, fontWeight: '700', color: '#10B981' },
});
