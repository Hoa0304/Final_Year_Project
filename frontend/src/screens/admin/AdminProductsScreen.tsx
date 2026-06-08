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
import api from '../../config/api';
import ImageUploadPicker from '../../components/ImageUploadPicker';
import { useRoute } from '@react-navigation/native';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  stock_quantity: number;
  is_active: boolean;
  status?: string;
  created_at: string;
}

export default function AdminProductsScreen({ route }: any) {
  const isModeration = route?.name === 'Moderation';
  const [modalVisible, setModalVisible] = useState(false);
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

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: async () => {
      const res = await api.get('/admin/products');
      return res.data;
    },
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

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await api.patch(`/admin/products/${id}/approve`, { status, reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      Alert.alert('Success', 'Product status updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
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

  const renderProduct = ({ item }: { item: Product }) => {
    const isActive = item.is_active;
    const statusText =
      item.status === 'pending_review' ? 'Pending' :
        item.status === 'approved' ? 'Approved' :
          item.status === 'rejected' ? 'Rejected' : (item.status || 'Active');

    return (
      <View style={styles.productCard}>
        <View style={styles.productImageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={36} color="#475569" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productPrice}>{Math.round(item.price).toLocaleString('en-US')} VND</Text>
          <Text style={styles.productStock}>Stock: <Text style={styles.stockValue}>{item.stock_quantity}</Text></Text>

          <View style={styles.badgeRow}>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              item.status === 'pending_review' && styles.statusPending,
              item.status === 'rejected' && styles.statusRejected,
              !isActive && styles.statusInactive
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'pending_review' && styles.statusTextPending,
                item.status === 'rejected' && styles.statusTextRejected,
                !isActive && styles.statusTextInactive
              ]}>
                {!isActive ? 'Hidden' : statusText}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.productActions}>
          {item.status === 'pending_review' ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => {
                  Alert.alert('Approve Product', `Approve product "${item.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Approve', onPress: () => approveMutation.mutate({ id: item.id, status: 'approved' }) }
                  ]);
                }}
              >
                <Ionicons name="checkmark" size={18} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => {
                  Alert.alert('Reject Product', `Reject product "${item.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reject', style: 'destructive', onPress: () => approveMutation.mutate({ id: item.id, status: 'rejected' }) }
                  ]);
                }}
              >
                <Ionicons name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="pencil" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const displayedProducts = (response?.products || []).filter((p: Product) =>
    isModeration ? p.status === 'pending_review' : p.status !== 'pending_review'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isModeration ? 'Approve Products' : 'Manage Products'}</Text>
          {!isModeration && (
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Ionicons name="add" size={24} color="#020617" />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={{ color: '#94A3B8', marginTop: 12 }}>Loading list...</Text>
          </View>
        ) : (
          <FlatList
            data={displayedProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="cube-outline" size={64} color="#334155" />
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
                <TouchableWithoutFeedback onPress={() => { }}>
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
                          <Ionicons name="close" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Name *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter product name"
                          placeholderTextColor="#64748B"
                          value={formData.name}
                          onChangeText={(text) => setFormData({ ...formData, name: text })}
                          returnKeyType="next"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Product description"
                          placeholderTextColor="#64748B"
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
                        <Text style={styles.label}>Price (VND) *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter price"
                          placeholderTextColor="#64748B"
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
                          placeholder="Enter quantity"
                          placeholderTextColor="#64748B"
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
                          placeholder="e.g. Electronics, Fashion..."
                          placeholderTextColor="#64748B"
                          value={formData.category}
                          onChangeText={(text) => setFormData({ ...formData, category: text })}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />
                      </View>

                      <ImageUploadPicker
                        label="Image"
                        placeholder="Enter URL or upload from device"
                        value={formData.imageUrl}
                        onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                        folder="products"
                      />

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
                              : 'Save Product'}
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  addButton: {
    backgroundColor: '#6366F1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: '#0F172A',
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
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
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  currency: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#94A3B8',
  },
  productStock: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  stockValue: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  statusPending: {
    backgroundColor: '#F59E0B20',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
  statusRejected: {
    backgroundColor: '#EF444420',
  },
  statusTextRejected: {
    color: '#EF4444',
  },
  statusInactive: {
    backgroundColor: '#334155',
  },
  statusTextInactive: {
    color: '#94A3B8',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#1E293B',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#3B82F620',
  },
  deleteButton: {
    backgroundColor: '#EF444420',
  },
  approveButton: {
    backgroundColor: '#10B98120',
  },
  rejectButton: {
    backgroundColor: '#EF444420',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 15,
    color: '#475569',
    marginTop: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#F8FAFC',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
});
