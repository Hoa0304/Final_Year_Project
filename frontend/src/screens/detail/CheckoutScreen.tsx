import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrder, mockVndPayment } from '../../services/order.service';
import { getBalance } from '../../services/user.service';
import { removeFromCart } from '../../services/shopping-cart.service';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Route params: supports single product OR array of cartItems
  const { product, quantity: routeQuantity, cartItems, vendor } = route.params || {};

  const [quantity, setQuantity] = useState(routeQuantity || 1);
  const [useCoins, setUseCoins] = useState(false);

  // Fetch current user coins balance
  const { data: balance = 0, isLoading: balanceLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: getBalance,
  });

  // Normalize items to check out
  const items = React.useMemo(() => {
    if (product) {
      return [
        {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.image_url,
          quantity: quantity,
        },
      ];
    } else if (cartItems && cartItems.length > 0) {
      return cartItems.map((item: any) => ({
        id: item.productId,
        name: item.product?.name || item.productName || 'Product',
        price: item.product?.price || item.productPrice || 0,
        imageUrl: item.product?.imageUrl || item.productImageUrl || item.product?.image_url,
        quantity: item.quantity,
        cartItemId: item.id,
      }));
    }
    return [];
  }, [product, quantity, cartItems]);

  // Calculations
  const totalPriceVnd = React.useMemo(() => {
    return items.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0), 0);
  }, [items]);

  const maxCoinsToUse = Math.min(Math.round(balance), totalPriceVnd);
  const coinsUsed = useCoins ? maxCoinsToUse : 0;
  const finalPriceVnd = totalPriceVnd - coinsUsed;

  const orderMutation = useMutation({
    mutationFn: async () => {
      const placedOrders = [];
      
      // Call createOrder sequentially for each item
      for (const item of items) {
        const orderData = await createOrder({
          productId: item.id,
          quantity: item.quantity,
          paymentMethod: 'vnd',
          useCoins: useCoins, // backend will automatically deduct remaining balance
          addressText: 'Default Address', // Can be customized
        });
        
        placedOrders.push(orderData.order);
        
        // Confirm payment automatically in DEV mode
        if (orderData.paymentInfo.status === 'pending_payment' && __DEV__) {
          try {
            await mockVndPayment(orderData.order.id);
          } catch (e) {
            console.error('Failed to mock VND payment:', e);
          }
        }
      }

      // If checkout from cart, remove checkout items
      if (cartItems && cartItems.length > 0) {
        for (const item of items) {
          if (item.cartItemId) {
            await removeFromCart(item.cartItemId);
          }
        }
      }

      return placedOrders;
    },
    onSuccess: async (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      Alert.alert('Success', 'Your order has been placed successfully!', [
        {
          text: 'View Order',
          onPress: () => {
            if (data.length === 1) {
              navigation.replace('OrderTracking', { orderId: data[0].id });
            } else {
              navigation.navigate('PurchaseHistory' as any);
            }
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Order Error', error?.response?.data?.error || 'Unable to place order. Please try again.');
    },
  });

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No products found for checkout</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Vendor Header if checkout from cart */}
        {vendor && (
          <View style={styles.vendorHeader}>
            <Ionicons name="storefront-outline" size={18} color="#818CF8" />
            <Text style={styles.vendorName}>{vendor.full_name || vendor.email}</Text>
          </View>
        )}

        {/* Products List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checkout Products</Text>
          {items.map((item: any, index: number) => (
            <View key={index} style={styles.productCard}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="cube-outline" size={30} color="#6366F1" />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.priceQtyRow}>
                  <Text style={styles.priceText}>{item.price.toLocaleString('en-US')} VND</Text>
                  <Text style={styles.qtyText}>x{item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Quantity Selector - Only for single product checkout */}
        {product && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? '#475569' : '#fff'} />
              </TouchableOpacity>
              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyText}>{quantity}</Text>
              </View>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity >= (product.stock_quantity || 99) && styles.qtyBtnDisabled]}
                onPress={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                disabled={quantity >= (product.stock_quantity || 99)}
              >
                <Ionicons name="add" size={20} color={quantity >= (product.stock_quantity || 99) ? '#475569' : '#fff'} />
              </TouchableOpacity>
              <Text style={styles.stockHint}>{product.stock_quantity || 0} products available</Text>
            </View>
          </View>
        )}

        {/* Shopee Coin Discount Offset */}
        <View style={styles.section}>
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.8)', 'rgba(15, 23, 42, 0.6)']}
            style={styles.coinContainer}
          >
            <View style={styles.coinHeader}>
              <Ionicons name="logo-bitcoin" size={22} color="#F59E0B" />
              <View style={styles.coinTextContainer}>
                <Text style={styles.coinTitle}>Use Shopee Coins for Discount</Text>
                <Text style={styles.coinSubtitle}>
                  You have: <Text style={styles.coinBalance}>{Math.round(balance).toLocaleString('en-US')} coins</Text>
                </Text>
              </View>
              <Switch
                value={useCoins}
                onValueChange={setUseCoins}
                disabled={maxCoinsToUse <= 0}
                trackColor={{ false: '#1E293B', true: '#F59E0B' }}
                thumbColor={useCoins ? '#fff' : '#94A3B8'}
              />
            </View>
            {useCoins && maxCoinsToUse > 0 && (
              <View style={styles.coinSavingInfo}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                <Text style={styles.coinSavingText}>
                  Used {maxCoinsToUse.toLocaleString('en-US')} coins to save {maxCoinsToUse.toLocaleString('en-US')} VND
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.deliveryCard}>
            <Ionicons name="time-outline" size={20} color="#6366F1" />
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryTitle}>Estimated Delivery Time</Text>
              <Text style={styles.deliveryDate}>
                {new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{totalPriceVnd.toLocaleString('en-US')} VND</Text>
            </View>
            {useCoins && maxCoinsToUse > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>Shopee Coins Discount</Text>
                <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>-{maxCoinsToUse.toLocaleString('en-US')} VND</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total Payment</Text>
              <Text style={styles.summaryTotalValue}>{finalPriceVnd.toLocaleString('en-US')} VND</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{finalPriceVnd.toLocaleString('en-US')} VND</Text>
        </View>

        <TouchableOpacity
          style={[styles.orderBtn, orderMutation.isPending && styles.orderBtnDisabled]}
          onPress={() => orderMutation.mutate()}
          disabled={orderMutation.isPending}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#06B6D4', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.orderBtnGradient}
          >
            {orderMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={styles.orderBtnText}>Place Order Now</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backLink: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backLinkText: {
    color: '#0ea5e9',
    fontWeight: 'bold',
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
  backBtn: {
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
  scroll: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    paddingBottom: 140,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  productCard: {
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  priceQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyDisplay: {
    width: 50,
    height: 36,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  stockHint: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  coinContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  coinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  coinTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  coinSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  coinBalance: {
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  coinSavingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
  },
  coinSavingText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  deliveryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  summaryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0ea5e9',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  orderBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderBtnDisabled: {
    opacity: 0.6,
  },
  orderBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  orderBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 16,
  },
});
