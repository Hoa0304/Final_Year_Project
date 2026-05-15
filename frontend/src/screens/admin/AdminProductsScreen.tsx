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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../config/api';
import { getVouchers, Voucher } from '../../services/voucher.service';
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
}

export default function AdminProductsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '',
    stockQuantity: '',
  });

  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: async () => {
      const res = await api.get('/admin/products');
      return res.data;
    },
  });

  // Fetch all vouchers for admin (can select from any vendor)
  const { data: vouchers = [] } = useQuery({
    queryKey: ['allVouchers'],
    queryFn: () => getVouchers(),
    enabled: voucherModalVisible || modalVisible,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/admin/products', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
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
      const res = await api.put(`/admin/products/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
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
      const res = await api.delete(`/admin/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      Alert.alert('Success', 'Product deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete product');
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
    setSelectedVoucherIds([]);
  };

  const openCreateModal = () => {
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
    // Load random_voucher_ids if exists
    setSelectedVoucherIds((product as any).random_voucher_ids || []);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Error', 'Name and price are required');
      return;
    }

    // Dismiss keyboard before submitting
    Keyboard.dismiss();

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      imageUrl: formData.imageUrl || undefined,
      category: formData.category || undefined,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      randomVoucherIds: selectedVoucherIds.length > 0 ? selectedVoucherIds : undefined,
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

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
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
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price} coins</Text>
        <Text style={styles.productStock}>Stock: {item.stock_quantity}</Text>
        {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
        <Text style={[styles.productStatus, !item.is_active && styles.inactive]}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Products Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text>Loading...</Text>
          </View>
        ) : (
      <FlatList
        data={response?.products || []}
        keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No products found</Text>
          </View>
            }
          />
        )}

        {/* Create/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            Keyboard.dismiss();
            setModalVisible(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.modalContent}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        {editingProduct ? 'Edit Product' : 'Create Product'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Keyboard.dismiss();
                          setModalVisible(false);
                        }}
                      >
                        <Ionicons name="close" size={24} color="#000" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Product Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Product Name *"
                        placeholderTextColor="#000"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Description"
                        placeholderTextColor="#000"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        multiline
                        numberOfLines={3}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        blurOnSubmit={true}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Price *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Price *"
                        placeholderTextColor="#000"
                        value={formData.price}
                        onChangeText={(text) => setFormData({ ...formData, price: text })}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Stock Quantity</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Stock Quantity"
                        placeholderTextColor="#000"
                        value={formData.stockQuantity}
                        onChangeText={(text) => setFormData({ ...formData, stockQuantity: text })}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Category</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Category"
                        placeholderTextColor="#000"
                        value={formData.category}
                        onChangeText={(text) => setFormData({ ...formData, category: text })}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <ImageUploadPicker
                      label="Image"
                      placeholder="Image URL or upload from device"
                      value={formData.imageUrl}
                      onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                      folder="products"
                    />

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Random Vouchers After Purchase</Text>
                      <Text style={styles.hint}>
                        Select vouchers that can be randomly issued to users after purchasing this product. Leave empty to use all claimable vouchers from the product's vendor.
                      </Text>
                      <TouchableOpacity
                        style={styles.voucherSelectButton}
                        onPress={() => setVoucherModalVisible(true)}
                      >
                        <Text style={styles.voucherSelectButtonText}>
                          {selectedVoucherIds.length > 0
                            ? `${selectedVoucherIds.length} voucher(s) selected`
                            : 'Select Vouchers (Optional)'}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.saveButton, (createMutation.isPending || updateMutation.isPending) && styles.buttonDisabled]}
                      onPress={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Text style={styles.saveButtonText}>
                        {createMutation.isPending || updateMutation.isPending
                          ? 'Saving...'
                          : editingProduct
                          ? 'Update'
                          : 'Create'}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {/* Voucher Selection Modal */}
        <Modal
          visible={voucherModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setVoucherModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Vouchers</Text>
                <TouchableOpacity onPress={() => setVoucherModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.voucherListContainer}>
                {vouchers.length === 0 ? (
                  <View style={styles.emptyVoucherContainer}>
                    <Ionicons name="ticket-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyVoucherText}>No vouchers available</Text>
                    <Text style={styles.emptyVoucherSubtext}>Create vouchers first to select them</Text>
                  </View>
                ) : (
                  vouchers.map((voucher) => {
                    const isSelected = selectedVoucherIds.includes(voucher.id);
                    const isExpired = new Date(voucher.expires_at) < new Date();
                    const isOutOfStock = voucher.total_usage_limit && voucher.current_usage_count >= voucher.total_usage_limit;
                    const isDisabled = isExpired || isOutOfStock;

                    return (
                      <TouchableOpacity
                        key={voucher.id}
                        style={[
                          styles.voucherItem,
                          isSelected && styles.voucherItemSelected,
                          isDisabled && styles.voucherItemDisabled,
                        ]}
                        onPress={() => {
                          if (isDisabled) return;
                          if (isSelected) {
                            setSelectedVoucherIds(selectedVoucherIds.filter((id) => id !== voucher.id));
                          } else {
                            setSelectedVoucherIds([...selectedVoucherIds, voucher.id]);
                          }
                        }}
                        disabled={isDisabled}
                      >
                        <View style={styles.voucherItemContent}>
                          <View style={styles.voucherItemLeft}>
                            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                            <View style={styles.voucherItemInfo}>
                              <Text style={styles.voucherItemCode}>{voucher.code}</Text>
                              <Text style={styles.voucherItemTitle}>{voucher.title}</Text>
                              <Text style={styles.voucherItemDiscount}>
                                {voucher.discount_value}
                                {voucher.discount_type === 'percentage' ? '%' : ' coins'}
                              </Text>
                            </View>
                          </View>
                          {isDisabled && (
                            <View style={styles.voucherItemBadge}>
                              <Text style={styles.voucherItemBadgeText}>
                                {isExpired ? 'Expired' : 'Out of Stock'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setVoucherModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => setVoucherModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextPrimary}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 15,
    backgroundColor: '#f0f0f0',
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
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 3,
  },
  productStock: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  productCategory: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  productStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  inactive: {
    color: '#FF3B30',
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
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
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  voucherSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  voucherSelectButtonText: {
    fontSize: 16,
    color: '#000',
  },
  voucherListContainer: {
    maxHeight: 400,
  },
  emptyVoucherContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyVoucherText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyVoucherSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  voucherItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  voucherItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  voucherItemDisabled: {
    opacity: 0.5,
  },
  voucherItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  voucherItemInfo: {
    flex: 1,
  },
  voucherItemCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  voucherItemTitle: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  voucherItemDiscount: {
    fontSize: 12,
    color: '#666',
  },
  voucherItemBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  voucherItemBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
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
});
