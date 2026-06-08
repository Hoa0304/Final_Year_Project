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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../config/api';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  virtual_balance: number;
  created_at: string;
}

export default function AdminUsersScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    },
  });

  const grantCoinsMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description?: string }) => {
      const res = await api.post(`/admin/users/${userId}/coins`, { amount, description });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setModalVisible(false);
      setAmount('');
      setDescription('');
      setSelectedUser(null);
      Alert.alert('Success', data.message || 'Coins granted/revoked successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to grant/revoke coins');
    },
  });

  const openGrantModal = (user: User) => {
    setSelectedUser(user);
    setAmount('');
    setDescription('');
    setModalVisible(true);
  };

  const handleGrantCoins = () => {
    if (!selectedUser) return;

    if (!amount || parseFloat(amount) === 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Dismiss keyboard before submitting
    Keyboard.dismiss();

    grantCoinsMutation.mutate({
      userId: selectedUser.id,
      amount: parseFloat(amount),
      description: description || undefined,
    });
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.full_name && <Text style={styles.userName}>{item.full_name}</Text>}
        <View style={styles.userDetails}>
          <Text style={styles.userBalance}>Balance: {Math.round(item.virtual_balance).toLocaleString('en-US')} coins</Text>
          <View style={[styles.roleBadge, item.role === 'admin' && styles.adminBadge, item.role === 'vendor' && styles.vendorBadge]}>
            <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.grantButton}
        onPress={() => openGrantModal(item)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
        <Text style={styles.grantButtonText}>Manage</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Users Management</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={response?.users || []}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            }
          />
        )}

        {/* Grant Coins Modal */}
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
                        <Text style={styles.modalTitle}>Grant/Revoke Coins</Text>
                        <TouchableOpacity
                          onPress={() => {
                            Keyboard.dismiss();
                            setModalVisible(false);
                          }}
                        >
                          <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                      </View>

                      {selectedUser && (
                        <>
                          <Text style={styles.userInfoText}>User: {selectedUser.email}</Text>
                          <Text style={styles.userInfoText}>
                            Current Balance: {Math.round(selectedUser.virtual_balance).toLocaleString('en-US')} coins
                          </Text>
                        </>
                      )}

                      <Text style={styles.inputLabel}>
                        Amount (positive to grant, negative to revoke)
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., 100 or -50"
                        placeholderTextColor="#000"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />

                      <Text style={styles.inputLabel}>Description (Optional)</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Reason for grant/revoke"
                        placeholderTextColor="#000"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={2}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        blurOnSubmit={true}
                      />

                      <TouchableOpacity
                        style={[styles.saveButton, grantCoinsMutation.isPending && styles.buttonDisabled]}
                        onPress={handleGrantCoins}
                        disabled={grantCoinsMutation.isPending}
                      >
                        <Text style={styles.saveButtonText}>
                          {grantCoinsMutation.isPending ? 'Processing...' : 'Confirm'}
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
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  listContent: {
    padding: 10,
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userBalance: {
    fontSize: 14,
    color: '#007AFF',
  },
  roleBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adminBadge: {
    backgroundColor: '#FF3B30',
  },
  vendorBadge: {
    backgroundColor: '#FF9500',
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 8,
  },
  grantButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
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
  userInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 60,
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
});
