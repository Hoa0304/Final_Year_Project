import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getVendorInfo, VendorInfo } from '../../services/vendor.service';
import { getVendorVouchers, claimVoucher, Voucher } from '../../services/voucher.service';
import { Product } from '../../services/product.service';
import { useAuth } from '../../context/AuthContext';
import { calculateDiscountedPrice } from '../../utils/price.utils';

export default function VendorShopScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { vendorId } = route.params as { vendorId: string };
  const [activeTab, setActiveTab] = useState<'products' | 'vouchers'>('products');

  const { data: vendorInfo, isLoading: isLoadingVendor, refetch: refetchVendor } = useQuery({
    queryKey: ['vendorInfo', vendorId],
    queryFn: () => getVendorInfo(vendorId),
  });

  const { data: vouchers = [], isLoading: isLoadingVouchers, refetch: refetchVouchers } = useQuery({
    queryKey: ['vendorVouchers', vendorId],
    queryFn: () => getVendorVouchers(vendorId),
    enabled: activeTab === 'vouchers',
  });

  const claimMutation = useMutation({
    mutationFn: (voucherId: string) => claimVoucher(voucherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorVouchers'] });
      queryClient.invalidateQueries({ queryKey: ['userIssuedVouchers'] });
      Alert.alert('Success', 'Voucher claimed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to claim voucher');
    },
  });

  const handleClaimVoucher = (voucher: Voucher) => {
    Alert.alert(
      'Claim Voucher',
      `Do you want to claim "${voucher.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: () => claimMutation.mutate(voucher.id),
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const discountedPrice = calculateDiscountedPrice(item.price, item.discount_percentage);
    const hasDiscount = item.discount_percentage && item.discount_percentage > 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => (navigation as any).navigate('ProductDetail', { productId: item.id })}
      >
        <View style={styles.productImageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceContainer}>
            {hasDiscount ? (
              <>
                <Text style={styles.productPriceOriginal}>{item.price.toFixed(2)} coins</Text>
                <Text style={styles.productPrice}>{discountedPrice.toFixed(2)} coins</Text>
              </>
            ) : (
              <Text style={styles.productPrice}>{item.price.toFixed(2)} coins</Text>
            )}
          </View>
          {item.stock_quantity === 0 && (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderVoucher = ({ item }: { item: Voucher }) => {
    const isOutOfStock = item.total_usage_limit && item.current_usage_count >= item.total_usage_limit;
    const isExpired = new Date(item.expires_at) < new Date();
    const canClaim = !isOutOfStock && !isExpired && item.is_claimable;

    return (
      <View style={[styles.voucherCard, (!canClaim || claimMutation.isPending) && styles.voucherCardDisabled]}>
        <View style={styles.voucherHeader}>
          <View style={styles.voucherCodeContainer}>
            <Text style={styles.voucherCode}>{item.code}</Text>
            {isOutOfStock && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Out of Stock</Text>
              </View>
            )}
            {isExpired && (
              <View style={[styles.statusBadge, styles.expiredBadge]}>
                <Text style={styles.statusText}>Expired</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.voucherTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.voucherDescription}>{item.description}</Text>
        )}
        <View style={styles.voucherDiscount}>
          <Text style={styles.discountText}>
            {item.discount_value}
            {item.discount_type === 'percentage' ? '% OFF' : ' coins'}
          </Text>
        </View>
        <View style={styles.voucherDetails}>
          <Text style={styles.detailText}>
            Expires: {new Date(item.expires_at).toLocaleDateString()}
          </Text>
          {item.total_usage_limit && (
            <Text style={styles.detailText}>
              Remaining: {item.total_usage_limit - item.current_usage_count} / {item.total_usage_limit}
            </Text>
          )}
        </View>
        {canClaim && (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => handleClaimVoucher(item)}
            disabled={claimMutation.isPending}
          >
            <Text style={styles.claimButtonText}>
              {claimMutation.isPending ? 'Claiming...' : 'Claim Voucher'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoadingVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading vendor shop...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vendorInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Vendor not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.vendorName}>{vendorInfo.vendor.full_name || vendorInfo.vendor.email}</Text>
          <Text style={styles.productCount}>{vendorInfo.productCount} products</Text>
        </View>
        {user?.id !== vendorId && (
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('Messages', { userId: vendorId })}
            style={styles.messageButton}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
            Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vouchers' && styles.tabActive]}
          onPress={() => setActiveTab('vouchers')}
        >
          <Text style={[styles.tabText, activeTab === 'vouchers' && styles.tabTextActive]}>
            Vouchers
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'products' ? (
        <FlatList
          key="products-list"
          data={vendorInfo.products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoadingVendor} onRefresh={refetchVendor} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products available</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="vouchers-list"
          data={vouchers}
          renderItem={renderVoucher}
          keyExtractor={(item) => item.id}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoadingVouchers} onRefresh={refetchVouchers} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No vouchers available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  messageButton: {
    padding: 8,
    marginLeft: 8,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productPriceOriginal: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  outOfStock: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  voucherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voucherCardDisabled: {
    opacity: 0.6,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voucherCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  voucherCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expiredBadge: {
    backgroundColor: '#999',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  voucherDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  voucherDiscount: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  discountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  voucherDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  claimButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
});

