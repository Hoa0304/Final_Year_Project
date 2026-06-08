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
import { Product } from '../../services/product.service';
import { useAuth } from '../../context/AuthContext';
import { calculateDiscountedPrice } from '../../utils/price.utils';

export default function VendorShopScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { vendorId } = route.params as { vendorId: string };

  const { data: vendorInfo, isLoading: isLoadingVendor, refetch: refetchVendor } = useQuery({
    queryKey: ['vendorInfo', vendorId],
    queryFn: () => getVendorInfo(vendorId),
  });



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
                <Text style={styles.productPriceOriginal}>{Math.round(item.price).toLocaleString('en-US')} VND</Text>
                <Text style={styles.productPrice}>{Math.round(discountedPrice).toLocaleString('en-US')} VND</Text>
              </>
            ) : (
              <Text style={styles.productPrice}>{Math.round(item.price).toLocaleString('en-US')} VND</Text>
            )}
          </View>
          {item.stock_quantity === 0 && (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          )}
        </View>
      </TouchableOpacity>
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
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
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
            <Ionicons name="chatbubble-outline" size={22} color="#F59E0B" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        key="products-list"
        data={vendorInfo.products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingVendor}
            onRefresh={refetchVendor}
            tintColor="#F59E0B"
            colors={['#F59E0B']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>No products available yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  messageButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#F59E0B15',
    borderRadius: 12,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  productCount: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    fontWeight: '700',
  },
  listContent: {
    padding: 8,
    paddingBottom: 40,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    margin: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  productImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
    height: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  productPriceOriginal: {
    fontSize: 11,
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  outOfStock: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#475569',
    marginTop: 16,
    fontWeight: '600',
  },
});

