import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, updateCartItem, removeFromCart, clearCart, CartItem } from '../../services/shopping-cart.service';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { purchaseProduct } from '../../services/product.service';
import { getVendorsByIds, Vendor } from '../../services/vendor.service';
import { calculateDiscountedPrice } from '../../utils/price.utils';
import { LinearGradient } from 'expo-linear-gradient';

interface VendorGroup {
  vendorId: string;
  vendor?: Vendor;
  items: CartItem[];
}

export default function ShoppingCartScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data: cartData, isLoading, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
  });

  const cartItems = cartData?.items || [];

  // Group cart items by vendor
  const vendorGroups = useMemo(() => {
    const groups: Record<string, VendorGroup> = {};

    cartItems.forEach((item) => {
      const vendorId = item.product?.created_by || 'unknown';
      if (!groups[vendorId]) {
        groups[vendorId] = {
          vendorId,
          items: [],
        };
      }
      groups[vendorId].items.push(item);
    });

    return Object.values(groups);
  }, [cartItems]);

  // Get unique vendor IDs
  const vendorIds = useMemo(() => {
    return vendorGroups.map(g => g.vendorId).filter(id => id !== 'unknown');
  }, [vendorGroups]);

  // Fetch vendor info
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-by-ids-cart', vendorIds],
    queryFn: () => getVendorsByIds(vendorIds),
    enabled: vendorIds.length > 0,
  });

  // Update vendor groups with vendor info
  const vendorGroupsWithInfo = useMemo(() => {
    return vendorGroups.map(group => ({
      ...group,
      vendor: vendors.find(v => v.id === group.vendorId),
    }));
  }, [vendorGroups, vendors]);

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Success', 'Cart cleared successfully');
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      await purchaseProduct({ productId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  function handleQuantityChange(item: CartItem, delta: number) {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;

    const stockQuantity = item.product?.stockQuantity || item.stockQuantity || 0;
    if (newQuantity > stockQuantity) {
      Alert.alert('Error', 'Insufficient stock');
      return;
    }
    updateItemMutation.mutate({ itemId: item.id, quantity: newQuantity });
  }

  function handleRemoveItem(item: CartItem) {
    const productName = item.product?.name || item.productName || 'this item';
    Alert.alert(
      'Remove Product',
      `Are you sure you want to remove ${productName} from the cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItemMutation.mutate(item.id),
        },
      ]
    );
  }

  // Calculate total for a vendor group
  function calculateVendorGroupTotal(group: VendorGroup): { original: number; final: number } {
    let original = 0;

    group.items.forEach((item) => {
      const product = item.product;
      if (product) {
        original += product.price * item.quantity;
      } else {
        original += (item.productPrice || 0) * item.quantity;
      }
    });

    return { original, final: original };
  }

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return vendorGroupsWithInfo.reduce((sum, group) => {
      const { final } = calculateVendorGroupTotal(group);
      return sum + final;
    }, 0);
  }, [vendorGroupsWithInfo]);

  function handleCheckoutVendorGroup(group: VendorGroup) {
    navigation.navigate('Checkout', { cartItems: group.items, vendor: group.vendor });
  }

  function renderVendorGroup({ item: group }: { item: VendorGroup }) {
    const { final } = calculateVendorGroupTotal(group);
    const vendorName = group.vendor?.full_name || group.vendor?.email || 'Vendor';

    return (
      <View style={styles.vendorGroup}>
        <View style={styles.vendorHeader}>
          <View style={styles.vendorTitleRow}>
            <Ionicons name="storefront-outline" size={18} color="#818CF8" style={{ marginRight: 6 }} />
            <Text style={styles.vendorName} numberOfLines={1}>{vendorName}</Text>
          </View>
          <Text style={styles.vendorItemCount}>{group.items.length} item(s)</Text>
        </View>

        {/* Cart Items */}
        {group.items.map((item) => {
          const product = item.product || {
            name: item.productName || 'Unknown product',
            price: item.productPrice || 0,
            imageUrl: item.productImageUrl,
            stockQuantity: item.stockQuantity || 0,
            discountPercentage: null,
          };

          const priceVnd = product.price;

          return (
            <View key={item.id} style={styles.cartItem}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#475569" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>{priceVnd.toLocaleString('en-US')} VND</Text>
                </View>

                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item, -1)}
                    disabled={item.quantity <= 1}
                  >
                    <Ionicons name="remove" size={16} color={item.quantity <= 1 ? '#475569' : '#818CF8'} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item, 1)}
                    disabled={item.quantity >= (product.stockQuantity || 0)}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={item.quantity >= (product.stockQuantity || 0) ? '#475569' : '#818CF8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.itemActions}>
                <Text style={styles.subtotal}>{(priceVnd * item.quantity).toLocaleString('en-US')} VND</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(item)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={[styles.priceRowSummary, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total price:</Text>
            <Text style={styles.totalValue}>{final.toLocaleString('en-US')} VND</Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={styles.checkoutVendorButton}
          onPress={() => handleCheckoutVendorGroup(group)}
        >
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkoutVendorButtonGradient}
          >
            <Text style={styles.checkoutVendorButtonText}>
              Checkout this group ({final.toLocaleString('en-US')} VND)
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading shopping cart...</Text>
          </View>
        ) : vendorGroupsWithInfo.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="cart-outline" size={64} color="#6366F1" />
            </View>
            <Text style={styles.emptyTextTitle}>Your shopping cart is empty</Text>
            <Text style={styles.emptyTextSub}>Explore products in the Marketplace</Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <Text style={styles.exploreButtonText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={vendorGroupsWithInfo}
              renderItem={renderVendorGroup}
              keyExtractor={(item) => item.vendorId}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading || false}
                  onRefresh={refetch}
                  tintColor="#6366F1"
                  colors={['#6366F1']}
                  progressBackgroundColor="#0F172A"
                />
              }
            />

            {/* Grand Total Footer */}
            <View style={styles.footer}>
              <View style={styles.grandTotalRow}>
                <View>
                  <Text style={styles.grandTotalLabel}>Total payment:</Text>
                  <Text style={styles.grandTotalSub}>You can use Shopee Coins for a discount at checkout</Text>
                </View>
                <Text style={styles.grandTotalAmount}>{grandTotal.toLocaleString('en-US')} VND</Text>
              </View>
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.clearButton]}
                  onPress={() => {
                    Alert.alert(
                      'Clear Cart',
                      'Are you sure you want to remove all products from the cart?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear All',
                          style: 'destructive',
                          onPress: () => clearCartMutation.mutate(),
                        },
                      ]
                    );
                  }}
                  disabled={clearCartMutation.isPending}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // Dark background
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 150,
  },
  vendorGroup: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  vendorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  vendorItemCount: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.6)',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34D399', // Emerald color
  },
  productPriceOriginal: {
    fontSize: 12,
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountBadgeText: {
    fontSize: 10,
    color: '#34D399',
    fontWeight: 'bold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
    color: '#F8FAFC',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  subtotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34D399',
    marginBottom: 8,
  },
  priceSummary: {
    marginTop: 8,
  },
  priceRowSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#818CF8',
  },
  checkoutVendorButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  checkoutVendorButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutVendorButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyTextSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  grandTotalSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  grandTotalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#818CF8',
  },
  footerButtons: {
    flexDirection: 'row',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
