import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getProductById,
  purchaseProduct,
  getProductRatings,
  getUserRating,
  submitRating,
  updateRating,
  deleteRating,
  ProductRatingsResponse,
  ProductRating,
} from '../../services/product.service';
import { getVoucherByCode, getUserIssuedVouchers, Voucher } from '../../services/voucher.service';
import { addToCart } from '../../services/shopping-cart.service';
import { calculateDiscountedPrice, calculateDiscountAmount } from '../../utils/price.utils';
import StarRating from '../../components/StarRating';

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { productId } = route.params as { productId: string };
  const [quantity, setQuantity] = useState(1);
  const [voucherCode, setVoucherCode] = useState('');
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProductById(productId),
  });

  // Fetch ratings
  const { data: ratingsData, isLoading: isLoadingRatings } = useQuery({
    queryKey: ['productRatings', productId],
    queryFn: () => getProductRatings(productId),
  });

  // Fetch user's rating (if exists) and purchase status
  const { data: userRatingData, refetch: refetchUserRating } = useQuery({
    queryKey: ['userRating', productId],
    queryFn: () => getUserRating(productId),
  });

  const userRating = userRatingData?.rating;
  const hasPurchased = userRatingData?.hasPurchased || false;

  // Fetch user's issued vouchers
  const { data: issuedVouchers = [] } = useQuery({
    queryKey: ['userIssuedVouchers'],
    queryFn: getUserIssuedVouchers,
  });

  const purchaseMutation = useMutation({
    mutationFn: (params: { productId: string; quantity?: number; voucherCode?: string; voucherId?: string }) => {
      return purchaseProduct(params);
    },
    onSuccess: async (data: any) => {
      // Invalidate and refetch notifications immediately
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      
      // Wait a bit for backend to create notification, then refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 500);
      
      let message = data.message || 'Product purchased successfully';
      if (data.order?.randomVoucher) {
        message += `\n\n🎁 You received a voucher: ${data.order.randomVoucher.code}!`;
      }
      if (data.order?.voucher) {
        message += `\n\n✅ Voucher "${data.order.voucher.code}" applied! Saved ${data.order.discountApplied?.toFixed(2)} coins.`;
      }
      
      Alert.alert('Success', message, [
        {
          text: 'OK',
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['userIssuedVouchers'] });
            setVoucherCode('');
            refetchUserRating(); // Refresh user rating check after purchase
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to purchase product');
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: () => addToCart(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Success', 'Item added to cart');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add to cart');
    },
  });

  // Rating mutations
  const submitRatingMutation = useMutation({
    mutationFn: submitRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRatings', productId] });
      queryClient.invalidateQueries({ queryKey: ['userRating', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Update average rating in product list
      setShowRatingModal(false);
      setReviewText('');
      Alert.alert('Success', 'Rating submitted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit rating');
    },
  });

  const updateRatingMutation = useMutation({
    mutationFn: updateRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRatings', productId] });
      queryClient.invalidateQueries({ queryKey: ['userRating', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowRatingModal(false);
      setReviewText('');
      Alert.alert('Success', 'Rating updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update rating');
    },
  });

  const deleteRatingMutation = useMutation({
    mutationFn: deleteRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRatings', productId] });
      queryClient.invalidateQueries({ queryKey: ['userRating', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      Alert.alert('Success', 'Rating deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete rating');
    },
  });

  // Calculate total price with discount and voucher
  const calculateTotalPrice = () => {
    if (!product) return 0;
    const discountedPrice = product.discountedPrice || product.price;
    let total = discountedPrice * quantity;
    
    // Apply voucher discount if voucher code is provided
    if (voucherCode && issuedVouchers.length > 0) {
      const selectedVoucher = issuedVouchers.find((item: any) => item.vouchers?.code === voucherCode);
      if (selectedVoucher?.vouchers) {
        const voucher = selectedVoucher.vouchers;
        if (voucher.discount_type === 'percentage') {
          total = total * (1 - voucher.discount_value / 100);
        } else if (voucher.discount_type === 'fixed_amount') {
          total = Math.max(0, total - voucher.discount_value);
        }
        // coin_bonus doesn't reduce the order amount
      }
    }
    
    return total;
  };

  function handlePurchase() {
    if (!product) return;
    if (quantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }
    if (product.stock_quantity < quantity) {
      Alert.alert('Error', 'Insufficient stock');
      return;
    }

    const totalPrice = calculateTotalPrice();
    const originalPrice = (product.discountedPrice || product.price) * quantity;
    const discountInfo = voucherCode ? `\n\nVoucher applied: ${voucherCode}\nTotal: ${totalPrice.toFixed(2)} coins (was ${originalPrice.toFixed(2)})` : '';

    Alert.alert(
      'Confirm Purchase',
      `Purchase ${quantity}x ${product.name} for ${totalPrice.toFixed(2)} coins?${discountInfo}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: () => {
            purchaseMutation.mutate({
              productId,
              quantity,
              ...(voucherCode && { voucherCode }),
            });
          },
        },
      ]
    );
  }

  function handleOpenRatingModal() {
    // Check if user has purchased before allowing rating
    if (!hasPurchased) {
      Alert.alert(
        'Purchase Required',
        'You must purchase this product before you can rate it.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (userRating) {
      setRatingValue(userRating.rating);
      setReviewText(userRating.review_text || '');
    } else {
      setRatingValue(5);
      setReviewText('');
    }
    setShowRatingModal(true);
  }

  function handleSubmitRating() {
    if (ratingValue < 1 || ratingValue > 5) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (userRating) {
      // Update existing rating
      updateRatingMutation.mutate({
        productId,
        ratingId: userRating.id,
        rating: ratingValue,
        reviewText: reviewText.trim() || undefined,
      });
    } else {
      // Submit new rating
      submitRatingMutation.mutate({
        productId,
        rating: ratingValue,
        reviewText: reviewText.trim() || undefined,
      });
    }
  }

  function handleDeleteRating() {
    if (!userRating) return;

    Alert.alert(
      'Delete Rating',
      'Are you sure you want to delete your rating?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRatingMutation.mutate({ productId, ratingId: userRating.id }),
        },
      ]
    );
  }

  if (isLoading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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
        <ScrollView style={styles.container}>

      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No Image</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        {product.category && (
          <Text style={styles.category}>{product.category}</Text>
        )}
        <View style={styles.priceContainer}>
          {product.hasDiscount && product.discountedPrice ? (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceOriginal}>{product.price.toFixed(2)} coins</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    -{product.discount_percentage}% OFF
                  </Text>
                </View>
              </View>
              <Text style={styles.price}>{product.discountedPrice.toFixed(2)} coins</Text>
              <Text style={styles.savingsText}>
                You save {calculateDiscountAmount(product.price, product.discount_percentage).toFixed(2)} coins!
              </Text>
            </>
          ) : (
            <Text style={styles.price}>{product.price.toFixed(2)} coins</Text>
          )}
        </View>

        {product.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Information</Text>
          <Text style={styles.stockText}>
            {product.stock_quantity > 0
              ? `${product.stock_quantity} available`
              : 'Out of stock'}
          </Text>
        </View>

        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voucher Section */}
        <View style={styles.voucherSection}>
          <TouchableOpacity
            style={styles.voucherToggle}
            onPress={() => setShowVoucherInput(!showVoucherInput)}
          >
            <Ionicons name="ticket-outline" size={20} color="#007AFF" />
            <Text style={styles.voucherToggleText}>
              {showVoucherInput ? 'Hide Voucher' : 'Apply Voucher'}
            </Text>
            <Ionicons
              name={showVoucherInput ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          {showVoucherInput && (
            <View style={styles.voucherInputContainer}>
              <TextInput
                style={styles.voucherInput}
                placeholder="Enter voucher code"
                placeholderTextColor="#999"
                value={voucherCode}
                onChangeText={setVoucherCode}
                autoCapitalize="characters"
              />
              {voucherCode && (
                <TouchableOpacity
                  style={styles.voucherClearButton}
                  onPress={() => setVoucherCode('')}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Show user's issued vouchers */}
          {issuedVouchers.length > 0 && (
            <View style={styles.issuedVouchersContainer}>
              <Text style={styles.issuedVouchersTitle}>Your Vouchers:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.issuedVouchersList}>
                {issuedVouchers.map((item: any) => {
                  const voucher = item.vouchers;
                  if (!voucher) return null;
                  const isExpired = new Date(voucher.expires_at) < new Date();
                  const isOutOfStock = voucher.total_usage_limit && voucher.current_usage_count >= voucher.total_usage_limit;
                  
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.issuedVoucherChip,
                        (isExpired || isOutOfStock) && styles.issuedVoucherChipDisabled,
                        voucherCode === voucher.code && styles.issuedVoucherChipActive,
                      ]}
                      onPress={() => {
                        if (!isExpired && !isOutOfStock) {
                          setVoucherCode(voucher.code);
                        }
                      }}
                      disabled={isExpired || isOutOfStock}
                    >
                      <Text style={styles.issuedVoucherCode}>{voucher.code}</Text>
                      <Text style={styles.issuedVoucherDiscount}>
                        {voucher.discount_value}
                        {voucher.discount_type === 'percentage' ? '%' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={styles.totalPrice}>
          Total: {calculateTotalPrice().toFixed(2)} coins
          {voucherCode && (
            <Text style={styles.voucherAppliedText}>
              {' '}(with voucher)
            </Text>
          )}
        </Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              (product.stock_quantity === 0 || addToCartMutation.isLoading) &&
                styles.buttonDisabled,
            ]}
            onPress={() => addToCartMutation.mutate()}
            disabled={product.stock_quantity === 0 || addToCartMutation.isLoading}
          >
            {addToCartMutation.isLoading ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color="#007AFF" />
                <Text style={styles.addToCartButtonText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.purchaseButton,
              (product.stock_quantity === 0 || purchaseMutation.isLoading) &&
                styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={product.stock_quantity === 0 || purchaseMutation.isLoading}
          >
            {purchaseMutation.isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                {product.stock_quantity === 0 ? 'Out of Stock' : 'Purchase'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Ratings Section */}
        <View style={styles.ratingsSection}>
          <View style={styles.ratingsHeader}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            {ratingsData && (
              <View style={styles.ratingSummary}>
                <StarRating
                  rating={ratingsData.averageRating}
                  readonly
                  size={24}
                  showRating
                />
                <Text style={styles.ratingCount}>
                  ({ratingsData.totalRatings} {ratingsData.totalRatings === 1 ? 'rating' : 'ratings'})
                </Text>
              </View>
            )}
          </View>

          {userRating ? (
            <View style={styles.userRatingCard}>
              <View style={styles.userRatingHeader}>
                <Text style={styles.userRatingTitle}>Your Rating</Text>
                <View style={styles.userRatingActions}>
                  <TouchableOpacity
                    onPress={handleOpenRatingModal}
                    style={styles.editButton}
                  >
                    <Ionicons name="create-outline" size={18} color="#007AFF" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeleteRating}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <StarRating rating={userRating.rating} readonly size={20} />
              {userRating.review_text && (
                <Text style={styles.userReviewText}>{userRating.review_text}</Text>
              )}
            </View>
          ) : hasPurchased ? (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={handleOpenRatingModal}
            >
              <Ionicons name="star-outline" size={20} color="#007AFF" />
              <Text style={styles.rateButtonText}>Rate this product</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.rateButtonDisabled}>
              <Ionicons name="star-outline" size={20} color="#ccc" />
              <Text style={styles.rateButtonTextDisabled}>
                Purchase this product to rate it
              </Text>
            </View>
          )}

          {/* Reviews List */}
          {ratingsData && ratingsData.ratings.length > 0 && (
            <View style={styles.reviewsList}>
              <Text style={styles.reviewsTitle}>Recent Reviews</Text>
              {ratingsData.ratings.slice(0, 5).map((rating) => (
                <View key={rating.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewerName}>
                        {rating.users?.full_name || rating.users?.email || 'Anonymous'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {new Date(rating.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <StarRating rating={rating.rating} readonly size={16} />
                  </View>
                  {rating.review_text && (
                    <Text style={styles.reviewText}>{rating.review_text}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {userRating ? 'Edit Your Rating' : 'Rate this Product'}
              </Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.ratingInputSection}>
                <Text style={styles.ratingLabel}>Rating</Text>
                <StarRating
                  rating={ratingValue}
                  onRatingChange={setRatingValue}
                  size={32}
                />
              </View>

              <View style={styles.reviewInputSection}>
                <Text style={styles.ratingLabel}>Review (Optional)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience with this product..."
                  placeholderTextColor="#000"
                  multiline
                  numberOfLines={4}
                  value={reviewText}
                  onChangeText={setReviewText}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSubmitRating}
                disabled={submitRatingMutation.isLoading || updateRatingMutation.isLoading}
              >
                {submitRatingMutation.isLoading || updateRatingMutation.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>
                    {userRating ? 'Update' : 'Submit'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  priceContainer: {
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  priceOriginal: {
    fontSize: 20,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  savingsText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  stockText: {
    fontSize: 16,
    color: '#666',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    color: '#000',
  },
  voucherSection: {
    marginBottom: 16,
  },
  voucherToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  voucherToggleText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
  },
  voucherInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  voucherInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  voucherClearButton: {
    marginLeft: 8,
  },
  issuedVouchersContainer: {
    marginTop: 12,
  },
  issuedVouchersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  issuedVouchersList: {
    flexDirection: 'row',
  },
  issuedVoucherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  issuedVoucherChipActive: {
    backgroundColor: '#34C759',
  },
  issuedVoucherChipDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  issuedVoucherCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginRight: 6,
  },
  issuedVoucherDiscount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  voucherAppliedText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#34C759',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  purchaseButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Ratings Section Styles
  ratingsSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  ratingsHeader: {
    marginBottom: 20,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  ratingCount: {
    fontSize: 16,
    color: '#666',
  },
  userRatingCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  userRatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userRatingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userRatingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  userReviewText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    lineHeight: 20,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  rateButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    opacity: 0.6,
  },
  rateButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  rateButtonTextDisabled: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  reviewsList: {
    marginTop: 10,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  // Modal Styles
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingInputSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reviewInputSection: {
    marginBottom: 20,
  },
  reviewInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    marginTop: 8,
  },
});

