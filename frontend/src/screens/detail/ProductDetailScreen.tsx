import React, { useState, useLayoutEffect } from 'react';
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
  getProducts,
  Product,
} from '../../services/product.service';
import { addToCart } from '../../services/shopping-cart.service';
import { calculateDiscountedPrice, calculateDiscountAmount } from '../../utils/price.utils';
import StarRating from '../../components/StarRating';

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { productId } = route.params as { productId: string };
  const [quantity, setQuantity] = useState(1);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Product Details',
    });
  }, [navigation]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProductById(productId),
  });

  // Fetch similar products
  const { data: similarProducts } = useQuery({
    queryKey: ['similarProducts', product?.category, productId],
    queryFn: () => getProducts({ category: product?.category, limit: 10 }),
    enabled: !!product?.category,
  });

  const filteredSimilarProducts = React.useMemo(() => {
    if (!similarProducts) return [];
    return similarProducts.filter((p: any) => p.id !== productId);
  }, [similarProducts, productId]);

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

  const purchaseMutation = useMutation({
    mutationFn: (params: { productId: string; quantity?: number }) => {
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

      let message = 'Product purchased successfully!';

      Alert.alert('Thành công', message, [
        {
          text: 'OK',
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            refetchUserRating(); // Refresh user rating check after purchase
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.response?.data?.error || 'Failed to purchase product');
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: () => addToCart(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Thành công', 'Product added to cart!');
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.response?.data?.error || 'Failed to add product to cart');
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
      Alert.alert('Thành công', 'Review submitted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.response?.data?.error || 'Failed to submit review');
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
      Alert.alert('Thành công', 'Review updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.response?.data?.error || 'Failed to update review');
    },
  });

  const deleteRatingMutation = useMutation({
    mutationFn: (variables: { productId: string; ratingId: string }) =>
      deleteRating(variables.productId, variables.ratingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productRatings', productId] });
      queryClient.invalidateQueries({ queryKey: ['userRating', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      Alert.alert('Thành công', 'Review deleted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.response?.data?.error || 'Failed to delete review');
    },
  });

  // Calculate total price with discount
  const calculateTotalPrice = () => {
    if (!product) return 0;
    const discountedPrice = product.discountedPrice || product.price;
    return discountedPrice * quantity;
  };

  function handlePurchase() {
    if (!product) return;
    if (quantity < 1) {
      Alert.alert('Lỗi', 'Quantity must be at least 1');
      return;
    }
    if (product.stock_quantity < quantity) {
      Alert.alert('Lỗi', 'Insufficient stock');
      return;
    }

    navigation.navigate('Checkout' as any, { product, quantity } as any);
  }

  function handleOpenRatingModal() {
    // Check if user has purchased before allowing rating
    if (!hasPurchased) {
      Alert.alert(
        'Purchase Required',
        'Bạn must purchase this product before you can rate and review it.',
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
      Alert.alert('Lỗi', 'Please select a star rating');
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
      'Delete Review',
      'Are you sure you want to delete your review?',
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
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 16 }}>Đang tải chi tiết sản phẩm...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.container}>

          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#475569" />
              <Text style={styles.imagePlaceholderText}>Không có hình ảnh</Text>
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
                    <Text style={styles.priceOriginal}>{Math.round(product.price).toLocaleString('en-US')} VNĐ</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {product.discount_percentage}% OFF
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.price}>{Math.round(product.discountedPrice).toLocaleString('en-US')} VNĐ</Text>
                  <Text style={styles.savingsText}>
                    Bạn save {Math.round(calculateDiscountAmount(product.price, product.discount_percentage)).toLocaleString('en-US')} VNĐ!
                  </Text>
                </>
              ) : (
                <Text style={styles.price}>{Math.round(product.price).toLocaleString('en-US')} VNĐ</Text>
              )}
            </View>

            {product.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
                <Text style={styles.description}>{product.description}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin kho</Text>
              <Text style={styles.stockText}>
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} items remaining`
                  : 'Out of stock'}
              </Text>
            </View>

            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Số lượng:</Text>
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

            <Text style={styles.totalPrice}>
              Total: {Math.round(calculateTotalPrice()).toLocaleString('en-US')} VNĐ
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.addToCartButton,
                  (product.stock_quantity === 0 || addToCartMutation.isPending) &&
                  styles.buttonDisabled,
                ]}
                onPress={() => addToCartMutation.mutate()}
                disabled={product.stock_quantity === 0 || addToCartMutation.isPending}
              >
                {addToCartMutation.isPending ? (
                  <ActivityIndicator color="#0ea5e9" />
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={20} color="#0ea5e9" />
                    <Text style={styles.addToCartButtonText}>Thêm vào giỏ</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (product.stock_quantity === 0 || purchaseMutation.isPending) &&
                  styles.purchaseButtonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={product.stock_quantity === 0 || purchaseMutation.isPending}
              >
                {purchaseMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {product.stock_quantity === 0 ? 'Out of stock' : 'Buy Now'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sản phẩm tương tự Section */}
            {filteredSimilarProducts.length > 0 && (
              <View style={styles.similarProductsSection}>
                <Text style={styles.sectionTitle}>Sản phẩm tương tự</Text>
                <ScrollView keyboardShouldPersistTaps="handled"
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.similarProductsContent}
                >
                  {filteredSimilarProducts.map((p: any) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.similarProductCard}
                      onPress={() => {
                        if (navigation.push) {
                          navigation.push('ProductDetail', { productId: p.id });
                        } else {
                          navigation.navigate('ProductDetail', { productId: p.id });
                        }
                      }}
                    >
                      <View style={styles.similarProductImageContainer}>
                        {p.image_url ? (
                          <Image source={{ uri: p.image_url }} style={styles.similarProductImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.similarProductImagePlaceholder}>
                            <Ionicons name="cube-outline" size={24} color="#6366F1" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.similarProductName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.similarProductPrice}>
                        {Math.round(p.price).toLocaleString('en-US')} VNĐ
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Ratings Section */}
            <View style={styles.ratingsSection}>
              <View style={styles.ratingsHeader}>
                <Text style={styles.sectionTitle}>Đánh giá & Nhận xét</Text>
                {ratingsData && (
                  <View style={styles.ratingSummary}>
                    <StarRating
                      rating={ratingsData.averageRating}
                      readonly
                      size={24}
                      showRating
                    />
                    <Text style={styles.ratingCount}>
                      ({ratingsData.totalRatings} ratings)
                    </Text>
                  </View>
                )}
              </View>

              {userRating ? (
                <View style={styles.userRatingCard}>
                  <View style={styles.userRatingHeader}>
                    <Text style={styles.userRatingTitle}>Đánh giá của bạn</Text>
                    <View style={styles.userRatingActions}>
                      <TouchableOpacity
                        onPress={handleOpenRatingModal}
                        style={styles.editButton}
                      >
                        <Ionicons name="create-outline" size={18} color="#0ea5e9" />
                        <Text style={styles.editButtonText}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleDeleteRating}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        <Text style={styles.deleteButtonText}>Xóa</Text>
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
                  <Ionicons name="star-outline" size={20} color="#0ea5e9" />
                  <Text style={styles.rateButtonText}>Đánh giá sản phẩm này</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.rateButtonDisabled}>
                  <Ionicons name="star-outline" size={20} color="#64748B" />
                  <Text style={styles.rateButtonTextDisabled}>
                    Mua sản phẩm để viết đánh giá
                  </Text>
                </View>
              )}

              {/* Reviews List */}
              {ratingsData && ratingsData.ratings.length > 0 && (
                <View style={styles.reviewsList}>
                  <Text style={styles.reviewsTitle}>Đánh giá gần đây</Text>
                  {ratingsData.ratings.slice(0, 5).map((rating) => (
                    <View key={rating.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View>
                          <Text style={styles.reviewerName}>
                            {rating.users?.full_name || rating.users?.email || 'Anonymous'}
                          </Text>
                          <Text style={styles.reviewDate}>
                            {new Date(rating.created_at).toLocaleDateString('en-US')}
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
                    {userRating ? 'Edit Review' : 'Rate Product'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                    <Ionicons name="close" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalBody}>
                  <View style={styles.ratingInputSection}>
                    <Text style={styles.ratingLabel}>Đánh giá sao</Text>
                    <StarRating
                      rating={ratingValue}
                      onRatingChange={setRatingValue}
                      size={32}
                    />
                  </View>

                  <View style={styles.reviewInputSection}>
                    <Text style={styles.ratingLabel}>Nhận xét (Tuỳ chọn)</Text>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                      placeholderTextColor="#64748B"
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
                    <Text style={styles.modalButtonTextSecondary}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={handleSubmitRating}
                    disabled={submitRatingMutation.isPending || updateRatingMutation.isPending}
                  >
                    {submitRatingMutation.isPending || updateRatingMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonTextPrimary}>
                        {userRating ? 'Cập nhật' : 'Submit'}
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
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#0F172A',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 8,
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#F8FAFC',
  },
  category: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 10,
  },
  priceContainer: {
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  priceOriginal: {
    fontSize: 20,
    color: '#64748B',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountBadge: {
    backgroundColor: '#EF4444',
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
    color: '#10B981',
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
    color: '#F8FAFC',
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
  },
  stockText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#0ea5e9',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    color: '#F8FAFC',
  },
  voucherSection: {
    marginBottom: 16,
  },
  voucherToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 8,
  },
  voucherToggleText: {
    flex: 1,
    fontSize: 16,
    color: '#F8FAFC',
    marginLeft: 8,
  },
  voucherInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
  },
  voucherInput: {
    flex: 1,
    fontSize: 16,
    color: '#F8FAFC',
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
    color: '#94A3B8',
    marginBottom: 8,
  },
  issuedVouchersList: {
    flexDirection: 'row',
  },
  issuedVoucherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  issuedVoucherChipActive: {
    backgroundColor: '#10B981',
  },
  issuedVoucherChipDisabled: {
    backgroundColor: '#1E293B',
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
    color: '#F8FAFC',
    marginBottom: 20,
    textAlign: 'center',
  },
  voucherAppliedText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#10B981',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartButtonText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  purchaseButton: {
    flex: 1,
    backgroundColor: '#0284c7',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#1E293B',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Sản phẩm tương tự Section Styles
  similarProductsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  similarProductsContent: {
    paddingVertical: 10,
    gap: 12,
  },
  similarProductCard: {
    width: 140,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 12,
  },
  similarProductImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  similarProductImage: {
    width: '100%',
    height: '100%',
  },
  similarProductImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  similarProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  similarProductPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0ea5e9',
  },
  // Ratings Section Styles
  ratingsSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
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
    color: '#94A3B8',
  },
  userRatingCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#F8FAFC',
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
    color: '#0ea5e9',
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
    color: '#94A3B8',
    marginTop: 10,
    lineHeight: 20,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  rateButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    opacity: 0.4,
  },
  rateButtonText: {
    fontSize: 16,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  rateButtonTextDisabled: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  reviewsList: {
    marginTop: 10,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#F8FAFC',
  },
  reviewCard: {
    backgroundColor: '#0F172A',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#F8FAFC',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginTop: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#0284c7',
  },
  modalButtonSecondary: {
    backgroundColor: '#1E293B',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#94A3B8',
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
    color: '#F8FAFC',
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

