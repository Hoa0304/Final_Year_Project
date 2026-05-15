import React, { useState, useMemo } from 'react';
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
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, updateCartItem, removeFromCart, clearCart, CartItem } from '../../services/shopping-cart.service';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { purchaseProduct, Product } from '../../services/product.service';
import { getVendorVouchers, getUserIssuedVouchers, Voucher, claimVoucher } from '../../services/voucher.service';
import { getVendorsByIds, Vendor } from '../../services/vendor.service';
import { calculateDiscountedPrice } from '../../utils/price.utils';

interface VendorGroup {
  vendorId: string;
  vendor?: Vendor;
  items: CartItem[];
  selectedVoucherId?: string;
  selectedVoucherCode?: string;
}

export default function ShoppingCartScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [selectedVouchers, setSelectedVouchers] = useState<Record<string, { voucherId?: string; voucherCode?: string }>>({});
  const [voucherModalVisible, setVoucherModalVisible] = useState<Record<string, boolean>>({});
  const [voucherCodeInput, setVoucherCodeInput] = useState<Record<string, string>>({});

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

  // Fetch vouchers for each vendor
  const vendorVouchersQueries = useQuery({
    queryKey: ['vendor-vouchers-cart', vendorIds],
    queryFn: async () => {
      const vouchersMap: Record<string, Voucher[]> = {};
      await Promise.all(
        vendorIds.map(async (vendorId) => {
          try {
            const vouchers = await getVendorVouchers(vendorId);
            vouchersMap[vendorId] = vouchers;
          } catch (error) {
            console.error(`Error fetching vouchers for vendor ${vendorId}:`, error);
            vouchersMap[vendorId] = [];
          }
        })
      );
      return vouchersMap;
    },
    enabled: vendorIds.length > 0,
  });

  const vendorVouchers = vendorVouchersQueries.data || {};

  // Fetch user's issued vouchers to check if vouchers are already claimed
  const { data: userIssuedVouchers = [] } = useQuery({
    queryKey: ['user-issued-vouchers-cart'],
    queryFn: getUserIssuedVouchers,
  });

  // Create a set of claimed voucher IDs
  const claimedVoucherIds = useMemo(() => {
    return new Set(userIssuedVouchers.map((issuance: any) => issuance.voucher_id || issuance.vouchers?.id));
  }, [userIssuedVouchers]);

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
      Alert.alert('Success', 'Cart cleared');
    },
  });

  const claimVoucherMutation = useMutation({
    mutationFn: (voucherId: string) => claimVoucher(voucherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-issued-vouchers-cart'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-vouchers-cart'] });
      Alert.alert('Success', 'Voucher claimed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to claim voucher');
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ 
      productId, 
      quantity, 
      voucherId, 
      voucherCode 
    }: { 
      productId: string; 
      quantity: number; 
      voucherId?: string; 
      voucherCode?: string;
    }) => {
      await purchaseProduct({ 
        productId, 
        quantity, 
        voucherId, 
        voucherCode 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  function handleQuantityChange(item: CartItem, delta: number) {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }
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
      'Remove Item',
      `Remove ${productName} from cart?`,
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

  // Calculate total for a vendor group with discount and voucher
  function calculateVendorGroupTotal(group: VendorGroup): { original: number; discount: number; voucherDiscount: number; final: number } {
    let original = 0;
    
    group.items.forEach((item) => {
      const product = item.product;
      if (product) {
        const discountedPrice = calculateDiscountedPrice(product.price, product.discountPercentage);
        original += discountedPrice * item.quantity;
      } else {
        original += (item.productPrice || 0) * item.quantity;
      }
    });

    const discount = 0; // Product discount already applied in discountedPrice
    let voucherDiscount = 0;

    // Apply voucher discount if selected
    if (selectedVouchers[group.vendorId]?.voucherId || selectedVouchers[group.vendorId]?.voucherCode) {
      const vouchers = vendorVouchers[group.vendorId] || [];
      const selectedVoucher = vouchers.find(
        v => v.id === selectedVouchers[group.vendorId]?.voucherId || 
             v.code === selectedVouchers[group.vendorId]?.voucherCode
      );

      if (selectedVoucher) {
        if (selectedVoucher.discount_type === 'percentage') {
          voucherDiscount = original * (selectedVoucher.discount_value / 100);
        } else if (selectedVoucher.discount_type === 'fixed_amount') {
          voucherDiscount = Math.min(selectedVoucher.discount_value, original);
        }
      }
    }

    const final = Math.max(0, original - voucherDiscount);

    return { original, discount, voucherDiscount, final };
  }

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return vendorGroupsWithInfo.reduce((sum, group) => {
      const { final } = calculateVendorGroupTotal(group);
      return sum + final;
    }, 0);
  }, [vendorGroupsWithInfo, selectedVouchers, vendorVouchers]);

  async function handleCheckoutVendorGroup(group: VendorGroup) {
    const { final } = calculateVendorGroupTotal(group);
    const voucher = selectedVouchers[group.vendorId];
    const vendorName = group.vendor?.full_name || group.vendor?.email || 'Vendor';

    Alert.alert(
      'Checkout',
      `Purchase ${group.items.length} item(s) from ${vendorName} for ${final.toFixed(0)} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            try {
              // Purchase all items in this vendor group
              for (const item of group.items) {
                await purchaseMutation.mutateAsync({ 
                  productId: item.productId, 
                  quantity: item.quantity,
                  voucherId: voucher?.voucherId,
                  voucherCode: voucher?.voucherCode,
                });
              }
              
              // Remove items from cart after successful purchase
              for (const item of group.items) {
                await removeFromCart(item.id);
              }
              
              queryClient.invalidateQueries({ queryKey: ['cart'] });
              Alert.alert('Success', `Purchase from ${vendorName} completed!`);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to complete purchase');
            }
          },
        },
      ]
    );
  }

  function handleSelectVoucher(group: VendorGroup, voucherId?: string, voucherCode?: string) {
    setSelectedVouchers(prev => ({
      ...prev,
      [group.vendorId]: { voucherId, voucherCode },
    }));
    setVoucherModalVisible(prev => ({ ...prev, [group.vendorId]: false }));
  }

  function handleApplyVoucherCode(group: VendorGroup) {
    const code = voucherCodeInput[group.vendorId]?.trim();
    if (!code) {
      Alert.alert('Error', 'Please enter a voucher code');
      return;
    }

    // Check if voucher code exists in vendor vouchers
    const vouchers = vendorVouchers[group.vendorId] || [];
    const voucher = vouchers.find(v => v.code.toLowerCase() === code.toLowerCase());
    
    if (voucher) {
      handleSelectVoucher(group, voucher.id, voucher.code);
      setVoucherCodeInput(prev => ({ ...prev, [group.vendorId]: '' }));
    } else {
      Alert.alert('Error', 'Invalid voucher code');
    }
  }

  function renderVendorGroup({ item: group }: { item: VendorGroup }) {
    const vouchers = vendorVouchers[group.vendorId] || [];
    const selectedVoucher = selectedVouchers[group.vendorId];
    const { original, discount, voucherDiscount, final } = calculateVendorGroupTotal(group);
    const vendorName = group.vendor?.full_name || group.vendor?.email || 'Unknown Vendor';

    return (
      <View style={styles.vendorGroup}>
        <View style={styles.vendorHeader}>
          <View>
            <Text style={styles.vendorName}>{vendorName}</Text>
            <Text style={styles.vendorItemCount}>{group.items.length} item(s)</Text>
          </View>
          <TouchableOpacity
            style={styles.voucherButton}
            onPress={() => setVoucherModalVisible(prev => ({ ...prev, [group.vendorId]: true }))}
          >
            <Ionicons name="ticket-outline" size={20} color="#007AFF" />
            <Text style={styles.voucherButtonText}>
              {selectedVoucher ? 'Change Voucher' : 'Apply Voucher'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cart Items */}
        {group.items.map((item) => {
          const product = item.product || {
            name: item.productName || 'Unknown Product',
            price: item.productPrice || 0,
            imageUrl: item.productImageUrl,
            stockQuantity: item.stockQuantity || 0,
            discountPercentage: null,
          };

          const discountedPrice = calculateDiscountedPrice(product.price, product.discountPercentage);
          const hasDiscount = product.discountPercentage && product.discountPercentage > 0;

          return (
            <View key={item.id} style={styles.cartItem}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#ccc" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <View style={styles.priceRow}>
                  {hasDiscount ? (
                    <>
                      <Text style={styles.productPriceOriginal}>{product.price.toFixed(0)}</Text>
                      <Text style={styles.productPrice}>{discountedPrice.toFixed(0)} coins</Text>
                    </>
                  ) : (
                    <Text style={styles.productPrice}>{product.price.toFixed(0)} coins</Text>
                  )}
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item, -1)}
                    disabled={item.quantity <= 1}
                  >
                    <Ionicons name="remove" size={20} color={item.quantity <= 1 ? '#ccc' : '#007AFF'} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item, 1)}
                    disabled={item.quantity >= product.stockQuantity}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={item.quantity >= product.stockQuantity ? '#ccc' : '#007AFF'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.itemActions}>
                <Text style={styles.subtotal}>{(discountedPrice * item.quantity).toFixed(0)} coins</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(item)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Selected Voucher Display */}
        {selectedVoucher && (
          <View style={styles.selectedVoucherContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.selectedVoucherText}>
              Voucher applied: {selectedVoucher.voucherCode || 'Selected'}
            </Text>
            <TouchableOpacity onPress={() => handleSelectVoucher(group)}>
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal:</Text>
            <Text style={styles.priceValue}>{original.toFixed(0)} coins</Text>
          </View>
          {voucherDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Voucher Discount:</Text>
              <Text style={[styles.priceValue, styles.discountText]}>-{voucherDiscount.toFixed(0)} coins</Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{final.toFixed(0)} coins</Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={styles.checkoutVendorButton}
          onPress={() => handleCheckoutVendorGroup(group)}
          disabled={purchaseMutation.isPending}
        >
          <Text style={styles.checkoutVendorButtonText}>
            Checkout {group.items.length} item(s)
          </Text>
        </TouchableOpacity>

        {/* Voucher Selection Modal */}
        <Modal
          visible={voucherModalVisible[group.vendorId] || false}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setVoucherModalVisible(prev => ({ ...prev, [group.vendorId]: false }))}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Voucher</Text>
                <TouchableOpacity
                  onPress={() => setVoucherModalVisible(prev => ({ ...prev, [group.vendorId]: false }))}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.voucherList}>
                {/* Voucher Code Input */}
                <View style={styles.voucherCodeContainer}>
                  <TextInput
                    style={styles.voucherCodeInput}
                    placeholder="Enter voucher code"
                    placeholderTextColor="#999"
                    value={voucherCodeInput[group.vendorId] || ''}
                    onChangeText={(text) => setVoucherCodeInput(prev => ({ ...prev, [group.vendorId]: text }))}
                    color="#000"
                  />
                  <TouchableOpacity
                    style={styles.applyCodeButton}
                    onPress={() => handleApplyVoucherCode(group)}
                  >
                    <Text style={styles.applyCodeButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>

                {/* No Voucher Option */}
                <TouchableOpacity
                  style={[styles.voucherOption, !selectedVoucher && styles.voucherOptionSelected]}
                  onPress={() => handleSelectVoucher(group)}
                >
                  <Text style={styles.voucherOptionText}>No Voucher</Text>
                </TouchableOpacity>

                {/* Available Vouchers */}
                {vouchers.map((voucher) => {
                  const isClaimed = claimedVoucherIds.has(voucher.id);
                  const isOutOfStock = voucher.total_usage_limit && voucher.current_usage_count >= voucher.total_usage_limit;
                  const isExpired = new Date(voucher.expires_at) < new Date();
                  const isSelected = selectedVoucher?.voucherId === voucher.id || selectedVoucher?.voucherCode === voucher.code;
                  const canUse = isClaimed && !isOutOfStock && !isExpired;

                  return (
                    <View key={voucher.id} style={styles.voucherCard}>
                      <View style={styles.voucherCardHeader}>
                        <Text style={styles.voucherCardCode}>{voucher.code}</Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        )}
                      </View>
                      <Text style={styles.voucherCardTitle}>{voucher.title}</Text>
                      {voucher.description && (
                        <Text style={styles.voucherCardDescription}>{voucher.description}</Text>
                      )}
                      <View style={styles.voucherCardDiscount}>
                        <Text style={styles.voucherCardDiscountText}>
                          {voucher.discount_value}
                          {voucher.discount_type === 'percentage' ? '% OFF' : ' coins'}
                        </Text>
                      </View>
                      <View style={styles.voucherCardDetails}>
                        <Text style={styles.voucherCardDetailText}>
                          Expires: {new Date(voucher.expires_at).toLocaleDateString()}
                        </Text>
                        {voucher.total_usage_limit && (
                          <Text style={styles.voucherCardDetailText}>
                            Remaining: {voucher.total_usage_limit - voucher.current_usage_count} / {voucher.total_usage_limit}
                          </Text>
                        )}
                      </View>
                      {!isClaimed && voucher.is_claimable && !isOutOfStock && !isExpired && (
                        <TouchableOpacity
                          style={styles.claimVoucherButton}
                          onPress={() => {
                            claimVoucherMutation.mutate(voucher.id);
                          }}
                          disabled={claimVoucherMutation.isPending}
                        >
                          <Text style={styles.claimVoucherButtonText}>
                            {claimVoucherMutation.isPending ? 'Claiming...' : 'Claim First'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {canUse && (
                        <TouchableOpacity
                          style={[styles.selectVoucherButton, isSelected && styles.selectVoucherButtonSelected]}
                          onPress={() => handleSelectVoucher(group, voucher.id, voucher.code)}
                        >
                          <Text style={[styles.selectVoucherButtonText, isSelected && styles.selectVoucherButtonTextSelected]}>
                            {isSelected ? 'Selected' : 'Select'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {!canUse && !voucher.is_claimable && (
                        <Text style={styles.voucherNotAvailableText}>Not available</Text>
                      )}
                    </View>
                  );
                })}

                {vouchers.length === 0 && (
                  <Text style={styles.noVouchersText}>No vouchers available for this vendor</Text>
                )}
              </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>Loading cart...</Text>
          </View>
        ) : vendorGroupsWithInfo.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={vendorGroupsWithInfo}
              renderItem={renderVendorGroup}
              keyExtractor={(item) => item.vendorId}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
            />
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total:</Text>
                <Text style={styles.totalAmount}>{grandTotal.toFixed(0)} coins</Text>
              </View>
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.clearButton]}
                  onPress={() => {
                    Alert.alert(
                      'Clear Cart',
                      'Remove all items from cart?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear',
                          style: 'destructive',
                          onPress: () => clearCartMutation.mutate(),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
        </View>
      </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  vendorGroup: {
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
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  vendorItemCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  voucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  voucherButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  productPriceOriginal: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
    color: '#000',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  subtotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  selectedVoucherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  selectedVoucherText: {
    flex: 1,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  priceSummary: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  discountText: {
    color: '#34C759',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  checkoutVendorButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  checkoutVendorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  voucherList: {
    padding: 20,
  },
  voucherCodeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  voucherCodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  applyCodeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyCodeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  voucherOption: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  voucherOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  voucherOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  voucherCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  voucherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voucherCardCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  voucherCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  voucherCardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  voucherCardDiscount: {
    marginBottom: 8,
  },
  voucherCardDiscountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  voucherCardDetails: {
    marginBottom: 10,
  },
  voucherCardDetailText: {
    fontSize: 12,
    color: '#666',
  },
  claimVoucherButton: {
    backgroundColor: '#FF9500',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  claimVoucherButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectVoucherButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectVoucherButtonSelected: {
    backgroundColor: '#34C759',
  },
  selectVoucherButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  selectVoucherButtonTextSelected: {
    color: '#fff',
  },
  voucherNotAvailableText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noVouchersText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f0f0f0',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
  },
  clearButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
});
