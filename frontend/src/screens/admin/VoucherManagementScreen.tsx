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
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import {
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  Voucher,
  CreateVoucherParams,
} from '../../services/voucher.service';

export default function VoucherManagementScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expiresDate, setExpiresDate] = useState(new Date());
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'coin_bonus',
    discount_value: '',
    usage_limit_per_user: '',
    total_usage_limit: '',
    expires_at: '',
    is_claimable: true,
    is_featured: false,
  });

  const queryClient = useQueryClient();

  const { data: vouchers = [], isLoading, refetch } = useQuery({
    queryKey: ['vouchers', user?.userId],
    queryFn: () => getVouchers({ created_by: user?.userId }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateVoucherParams) => {
      return await createVoucher(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Voucher created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create voucher');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVoucherParams & { is_featured?: boolean }> }) => {
      return await updateVoucher(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Voucher updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update voucher');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteVoucher(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      Alert.alert('Success', 'Voucher deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete voucher');
    },
  });

  const resetForm = () => {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1); // Default to 1 month from now
    setExpiresDate(defaultDate);
    setFormData({
      code: '',
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      usage_limit_per_user: '',
      total_usage_limit: '',
      expires_at: '',
      is_claimable: true,
      is_featured: false,
    });
    setEditingVoucher(null);
  };

  const handleOpenModal = (voucher?: Voucher) => {
    if (voucher) {
      setEditingVoucher(voucher);
      const expiresDateValue = new Date(voucher.expires_at);
      setExpiresDate(expiresDateValue);
      
      setFormData({
        code: voucher.code,
        title: voucher.title,
        description: voucher.description || '',
        discount_type: voucher.discount_type,
        discount_value: String(voucher.discount_value),
        usage_limit_per_user: voucher.usage_limit_per_user ? String(voucher.usage_limit_per_user) : '',
        total_usage_limit: voucher.total_usage_limit ? String(voucher.total_usage_limit) : '',
        expires_at: expiresDateValue.toISOString(),
        is_claimable: voucher.is_claimable,
        is_featured: voucher.is_featured,
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.code || !formData.title || !formData.discount_value || !formData.expires_at) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const discountValue = parseFloat(formData.discount_value);
    if (isNaN(discountValue) || discountValue <= 0) {
      Alert.alert('Error', 'Discount value must be a positive number');
      return;
    }

    if (formData.discount_type === 'percentage' && discountValue > 100) {
      Alert.alert('Error', 'Percentage discount cannot exceed 100%');
      return;
    }

    // Use expiresDate for expiry
    const expiresAt = expiresDate.toISOString();

    const voucherData: CreateVoucherParams = {
      code: formData.code.toUpperCase(),
      title: formData.title,
      description: formData.description || undefined,
      discount_type: formData.discount_type,
      discount_value: discountValue,
      usage_limit_per_user: formData.usage_limit_per_user ? parseInt(formData.usage_limit_per_user) : undefined,
      total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : undefined,
      expires_at: expiresAt,
      is_claimable: formData.is_claimable,
    };

    if (editingVoucher) {
      const updateData: any = { ...voucherData };
      if (isAdmin) {
        updateData.is_featured = formData.is_featured;
      }
      updateMutation.mutate({ id: editingVoucher.id, data: updateData });
    } else {
      createMutation.mutate(voucherData);
    }
  };

  const handleDelete = (voucher: Voucher) => {
    Alert.alert(
      'Delete Voucher',
      `Are you sure you want to delete voucher "${voucher.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(voucher.id),
        },
      ]
    );
  };

  const renderVoucher = ({ item }: { item: Voucher }) => {
    const isOutOfStock = item.total_usage_limit && item.current_usage_count >= item.total_usage_limit;
    const isExpired = new Date(item.expires_at) < new Date();

    return (
      <View style={styles.voucherCard}>
        <View style={styles.voucherHeader}>
          <View style={styles.voucherCodeContainer}>
            <Text style={styles.voucherCode}>{item.code}</Text>
            {item.is_featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            )}
            {item.is_claimable && (
              <View style={styles.claimableBadge}>
                <Text style={styles.claimableBadgeText}>Claimable</Text>
              </View>
            )}
          </View>
          <View style={styles.voucherActions}>
            <TouchableOpacity
              onPress={() => handleOpenModal(item)}
              style={styles.actionButton}
            >
              <Ionicons name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={styles.actionButton}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.voucherTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.voucherDescription}>{item.description}</Text>
        )}
        <View style={styles.voucherDetails}>
          <Text style={styles.detailText}>
            Discount: {item.discount_value}
            {item.discount_type === 'percentage' ? '%' : ' coins'}
          </Text>
          <Text style={styles.detailText}>
            Usage: {item.current_usage_count}
            {item.total_usage_limit ? ` / ${item.total_usage_limit}` : ' / ∞'}
          </Text>
          <Text style={styles.detailText}>
            Expires: {new Date(item.expires_at).toLocaleDateString()}
          </Text>
        </View>
        {(isOutOfStock || isExpired) && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {isOutOfStock ? 'Out of Stock' : 'Expired'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voucher Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenModal()}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading vouchers...</Text>
        </View>
      ) : (
        <FlatList
          data={vouchers}
          renderItem={renderVoucher}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No vouchers yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create your first voucher</Text>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {editingVoucher ? 'Edit Voucher' : 'Create Voucher'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(false);
                        resetForm();
                      }}
                    >
                      <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody}>
                    <Text style={styles.label}>Code *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.code}
                      onChangeText={(text) => setFormData({ ...formData, code: text })}
                      placeholder="VOUCHER2024"
                      placeholderTextColor="#999"
                      autoCapitalize="characters"
                    />

                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.title}
                      onChangeText={(text) => setFormData({ ...formData, title: text })}
                      placeholder="Summer Sale 20%"
                      placeholderTextColor="#999"
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      placeholder="Voucher description"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={styles.label}>Discount Type *</Text>
                    <View style={styles.radioGroup}>
                      {['percentage', 'fixed_amount', 'coin_bonus'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.radioOption}
                          onPress={() => setFormData({ ...formData, discount_type: type as any })}
                        >
                          <View style={styles.radio}>
                            {formData.discount_type === type && (
                              <View style={styles.radioSelected} />
                            )}
                          </View>
                          <Text style={styles.radioLabel}>
                            {type === 'percentage' ? 'Percentage' : type === 'fixed_amount' ? 'Fixed Amount' : 'Coin Bonus'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>Discount Value *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.discount_value}
                      onChangeText={(text) => setFormData({ ...formData, discount_value: text })}
                      placeholder={formData.discount_type === 'percentage' ? '20' : '100'}
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />

                    <Text style={styles.label}>Usage Limit Per User</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.usage_limit_per_user}
                      onChangeText={(text) => setFormData({ ...formData, usage_limit_per_user: text })}
                      placeholder="1 (leave empty for unlimited)"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />

                    <Text style={styles.label}>Total Usage Limit</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.total_usage_limit}
                      onChangeText={(text) => setFormData({ ...formData, total_usage_limit: text })}
                      placeholder="100 (leave empty for unlimited)"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />

                    <Text style={styles.label}>Expires At *</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.datePickerText}>
                        {expiresDate.toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={expiresDate}
                          mode="datetime"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, selectedDate) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (selectedDate) {
                              setExpiresDate(selectedDate);
                              setFormData({ ...formData, expires_at: selectedDate.toISOString() });
                            }
                          }}
                          minimumDate={new Date()}
                          textColor="#000000"
                          themeVariant="light"
                          style={Platform.OS === 'ios' ? styles.datePickerIOS : undefined}
                        />
                      </View>
                    )}

                    <View style={styles.switchRow}>
                      <Text style={styles.label}>User Can Claim</Text>
                      <Switch
                        value={formData.is_claimable}
                        onValueChange={(value) => setFormData({ ...formData, is_claimable: value })}
                      />
                    </View>

                    {isAdmin && (
                      <View style={styles.switchRow}>
                        <Text style={styles.label}>Featured (Show in Public Page)</Text>
                        <Switch
                          value={formData.is_featured}
                          onValueChange={(value) => setFormData({ ...formData, is_featured: value })}
                        />
                      </View>
                    )}
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        setModalVisible(false);
                        resetForm();
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Text style={styles.saveButtonText}>
                        {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
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
    flex: 1,
  },
  voucherCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  featuredBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  claimableBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  claimableBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  voucherActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 12,
    padding: 4,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  voucherDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  voucherDetails: {
    marginTop: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    marginTop: 8,
    padding: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#000',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  datePickerIOS: {
    backgroundColor: '#fff',
    width: '100%',
    height: 200,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

