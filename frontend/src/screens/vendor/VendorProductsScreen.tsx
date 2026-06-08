import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../config/api';
import { setProductDiscount } from '../../services/product.service';
import { validateDiscountPercentage, calculateDiscountedPrice } from '../../utils/price.utils';
import { getVendorAnalytics } from '../../services/vendor.service';
import ImageUploadPicker from '../../components/ImageUploadPicker';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  discount_percentage?: number | null;
  discountedPrice?: number;
  hasDiscount?: boolean;
  status?: string;
}

export default function VendorProductsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '',
    stockQuantity: '',
  });

  const queryClient = useQueryClient();

  // Fetch Vendor Analytics for weekly limit
  const { data: analyticsData } = useQuery({
    queryKey: ['vendorAnalytics', 30],
    queryFn: () => getVendorAnalytics(30),
  });

  const analytics = analyticsData?.analytics;
  const canPostProduct = analytics?.canPostProduct ?? true;
  const productLimit = analytics?.productLimit ?? -1;
  const productsThisWeek = analytics?.productsThisWeek ?? 0;

  const { data: response, isLoading } = useQuery({
    queryKey: ['vendorProducts'],
    queryFn: async () => {
      const res = await api.get('/vendor/products');
      return res.data;
    },
  });



  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/vendor/products', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
      queryClient.invalidateQueries({ queryKey: ['vendorAnalytics'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Product created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/vendor/products/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Product updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/vendor/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
      Alert.alert('Success', 'Product deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete product');
    },
  });

  const discountMutation = useMutation({
    mutationFn: async ({ productId, discountPercentage }: { productId: string; discountPercentage: number | null }) => {
      return await setProductDiscount(productId, discountPercentage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      setDiscountModalVisible(false);
      setSelectedProduct(null);
      setDiscountPercentage('');
      Alert.alert('Success', 'Discount updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update discount');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      category: '',
      stockQuantity: '',
    });
    setEditingProduct(null);
  };

  const openCreateModal = () => {
    if (!canPostProduct) {
      Alert.alert(
        'Listing Limit',
        'You have reached your product listing limit for this week. Please upgrade your package to list more.',
        [{ text: 'Close', style: 'cancel' }]
      );
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      imageUrl: product.image_url || '',
      category: product.category || '',
      stockQuantity: product.stock_quantity.toString(),
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    Keyboard.dismiss();
    if (!formData.name || !formData.price) {
      Alert.alert('Error', 'Name and price are required');
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      imageUrl: formData.imageUrl || undefined,
      category: formData.category || undefined,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(product.id),
        },
      ]
    );
  };

  const openDiscountModal = (product: Product) => {
    setSelectedProduct(product);
    setDiscountPercentage(product.discount_percentage?.toString() || '');
    setDiscountModalVisible(true);
  };

  const handleSaveDiscount = () => {
    if (!selectedProduct) return;

    const discountValue = discountPercentage.trim() === '' ? null : parseFloat(discountPercentage);
    const validation = validateDiscountPercentage(discountValue);

    if (!validation.isValid) {
      Alert.alert('Error', validation.error || 'Invalid discount percentage');
      return;
    }

    discountMutation.mutate({
      productId: selectedProduct.id,
      discountPercentage: discountValue,
    });
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const discountPercent = item.discount_percentage ?? 0;
    const hasDiscount = item.hasDiscount || (discountPercent > 0);
    const finalPrice = hasDiscount && item.discountedPrice ? item.discountedPrice : item.price;

    return (
      <View style={styles.productCard}>
        <View style={styles.productImageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color="#475569" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceContainer}>
            {hasDiscount ? (
              <>
                <Text style={styles.productPriceOriginal}>{item.price.toLocaleString('en-US')} VND</Text>
                <Text style={styles.productPrice}>{finalPrice.toLocaleString('en-US')} <Text style={styles.currency}>VND</Text></Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>-{discountPercent.toFixed(0)}%</Text>
                </View>
              </>
            ) : (
              <Text style={styles.productPrice}>{item.price.toLocaleString('en-US')} <Text style={styles.currency}>VND</Text></Text>
            )}
          </View>
          <Text style={styles.productStock}>Stock: <Text style={styles.stockValue}>{item.stock_quantity}</Text></Text>

          <View style={styles.statusRow}>
            {item.category && <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>}
            <View style={[styles.statusBadge, !item.is_active && styles.statusInactive]}>
              <Text style={[styles.statusText, !item.is_active && styles.statusTextInactive]}>
                {item.is_active ? 'On Sale' : 'Hidden'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.productActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B20' }]} onPress={() => openDiscountModal(item)}>
            <Ionicons name="pricetag" size={18} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F620' }]} onPress={() => openEditModal(item)}>
            <Ionicons name="pencil" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444420' }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0F172A', '#020617']} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Products</Text>
          <Text style={styles.headerSub}>Manage inventory</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, !canPostProduct && styles.addButtonDisabled]}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={24} color={canPostProduct ? '#020617' : '#94A3B8'} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Limit Indicator */}
      <View style={styles.limitContainer}>
        <View style={styles.limitHeader}>
          <Text style={styles.limitLabel}>Listing limit this week</Text>
          <Text style={styles.limitValue}>
            {productsThisWeek} / {productLimit === -1 ? '∞' : productLimit}
          </Text>
        </View>
        {productLimit !== -1 && (
          <View style={styles.limitBarBg}>
            <View
              style={[
                styles.limitBarFill,
                {
                  width: `${Math.min(100, (productsThisWeek / productLimit) * 100)}%`,
                  backgroundColor: !canPostProduct ? '#EF4444' : '#10B981'
                }
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <FlatList
            data={response?.products || []}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="cube-outline" size={64} color="#334155" />
                <Text style={styles.emptyText}>No products found.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Create Product'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Product Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Product name"
                    placeholderTextColor="#64748B"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description"
                    placeholderTextColor="#64748B"
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                    <Text style={styles.label}>Product Price (VND) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="#64748B"
                      value={formData.price}
                      onChangeText={(text) => setFormData({ ...formData, price: text })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Stock Quantity</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="#64748B"
                      value={formData.stockQuantity}
                      onChangeText={(text) => setFormData({ ...formData, stockQuantity: text })}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Electronics, Fashion..."
                    placeholderTextColor="#64748B"
                    value={formData.category}
                    onChangeText={(text) => setFormData({ ...formData, category: text })}
                  />
                </View>

                <ImageUploadPicker
                  label="Image"
                  placeholder="URL or upload"
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                  folder="products"
                />

                <TouchableOpacity
                  style={[styles.saveButton, (createMutation.isPending || updateMutation.isPending) && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <ActivityIndicator color="#020617" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{editingProduct ? 'Update' : 'Save Product'}</Text>
                  )}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Discount Modal */}
      <Modal visible={discountModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Discount</Text>
                <TouchableOpacity onPress={() => setDiscountModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {selectedProduct && (
                <>
                  <Text style={styles.discountProductName}>{selectedProduct.name}</Text>
                  <Text style={styles.discountProductPrice}>Original Price: {selectedProduct.price.toLocaleString('en-US')} VND</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Discount % (0-100)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 15"
                      placeholderTextColor="#64748B"
                      value={discountPercentage}
                      onChangeText={setDiscountPercentage}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  {discountPercentage && !isNaN(parseFloat(discountPercentage)) && (
                    <View style={styles.discountPreview}>
                      <Text style={styles.discountPreviewLabel}>Price after discount:</Text>
                      <Text style={styles.discountPreviewPrice}>
                        {Math.round(calculateDiscountedPrice(selectedProduct.price, parseFloat(discountPercentage))).toLocaleString('en-US')} VND
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.saveButton, discountMutation.isPending && styles.buttonDisabled]}
                    onPress={handleSaveDiscount}
                  >
                    <Text style={styles.saveButtonText}>
                      {discountPercentage.trim() === '' || parseFloat(discountPercentage) === 0 ? 'Remove Discount' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#F8FAFC' },
  headerSub: { fontSize: 13, color: '#94A3B8' },
  addButton: { backgroundColor: '#10B981', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  addButtonDisabled: { backgroundColor: '#1E293B' },
  limitContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  limitLabel: { fontSize: 13, color: '#94A3B8' },
  limitValue: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  limitBarBg: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  limitBarFill: { height: '100%', borderRadius: 3 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#64748B', marginTop: 16, fontSize: 15 },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  productCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#1E293B' },
  productImageContainer: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', marginRight: 12, backgroundColor: '#1E293B' },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },
  productPriceOriginal: { fontSize: 12, color: '#64748B', textDecorationLine: 'line-through' },
  currency: { fontSize: 11, fontWeight: 'normal', color: '#94A3B8' },
  discountBadge: { backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountBadgeText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
  productStock: { fontSize: 12, color: '#94A3B8', marginBottom: 6 },
  stockValue: { color: '#F8FAFC', fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 6 },
  categoryBadge: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryText: { fontSize: 10, color: '#E2E8F0', fontWeight: '600' },
  statusBadge: { backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  statusInactive: { backgroundColor: '#EF444420' },
  statusTextInactive: { color: '#EF4444' },
  productActions: { justifyContent: 'space-between', paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#1E293B' },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%', borderWidth: 1, borderColor: '#1E293B' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  closeBtn: { padding: 4 },
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 8 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 14, fontSize: 15, color: '#F8FAFC' },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#020617', fontSize: 15, fontWeight: '700' },
  discountProductName: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  discountProductPrice: { fontSize: 13, color: '#94A3B8', marginBottom: 20 },
  discountPreview: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountPreviewLabel: { fontSize: 13, color: '#94A3B8' },
  discountPreviewPrice: { fontSize: 18, fontWeight: '800', color: '#F59E0B' },
});
