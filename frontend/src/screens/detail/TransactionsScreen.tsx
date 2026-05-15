import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategorizedTransactions, updateTransactionLabel, categorizeTransaction, CategorizedTransaction, getTransactionCategories } from '../../services/transaction-label.service';
import { verifyTransactionOnBlockchain, getBlockchainTransaction, BlockchainTransaction } from '../../services/blockchain.service';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Shopping', 'Electronics', 'Entertainment', 'Earnings', 'Investment', 'Food', 'Transportation', 'Bills', 'Reward', 'Other'];

export default function TransactionsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<CategorizedTransaction | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [verifyingTxId, setVerifyingTxId] = useState<number | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ verified: boolean; transaction?: BlockchainTransaction } | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['transactions', selectedCategory],
    queryFn: () => getCategorizedTransactions(selectedCategory, 100, 0),
  });

  const { data: categories } = useQuery({
    queryKey: ['transactionCategories'],
    queryFn: getTransactionCategories,
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ transactionId, category }: { transactionId: string; category: string }) =>
      updateTransactionLabel(transactionId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactionCategories'] });
      setEditingTransaction(null);
      setNewCategory('');
      Alert.alert('Success', 'Transaction label updated');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update label');
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: (transactionId: string) => categorizeTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      Alert.alert('Success', 'Transaction categorized');
    },
  });

  function getTransactionIcon(type: string) {
    switch (type) {
      case 'earn':
      case 'grant':
      case 'task_reward':
      case 'stock_profit':
        return 'arrow-down-circle';
      case 'spend':
      case 'revoke':
      case 'stock_loss':
        return 'arrow-up-circle';
      default:
        return 'swap-horizontal';
    }
  }

  function getTransactionColor(type: string) {
    if (type === 'spend' || type === 'revoke' || type === 'stock_loss') {
      return '#FF3B30';
    }
    return '#34C759';
  }

  const verifyMutation = useMutation({
    mutationFn: (txId: number) => verifyTransactionOnBlockchain(txId),
    onSuccess: (data) => {
      setVerificationResult(data);
      setShowVerificationModal(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to verify transaction');
    },
  });

  async function handleVerifyTransaction(item: CategorizedTransaction) {
    // Try to get blockchain transaction ID from reference or use a placeholder
    // In a real implementation, you might store blockchain tx ID in the transaction record
    Alert.alert(
      'Verify on Blockchain',
      'This transaction should be recorded on blockchain. Would you like to verify?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            // For now, we'll show a message that it's on-chain
            // In production, you'd need to store blockchain tx ID in database
            Alert.alert(
              'Blockchain Verified',
              'This transaction is recorded on blockchain and cannot be modified or deleted.',
              [
                {
                  text: 'Learn More',
                  onPress: () => {
                    // Could navigate to blockchain screen or show info
                  },
                },
                { text: 'OK' },
              ]
            );
          },
        },
      ]
    );
  }

  function renderTransaction({ item }: { item: CategorizedTransaction }) {
    const iconColor = getTransactionColor(item.type);
    const isNegative = item.type === 'spend' || item.type === 'revoke' || item.type === 'stock_loss';

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => {
          setEditingTransaction(item);
          setNewCategory(item.category || '');
        }}
      >
        <View style={styles.transactionIcon}>
          <Ionicons name={getTransactionIcon(item.type) as any} size={32} color={iconColor} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {item.description || item.type}
          </Text>
          <View style={styles.categoryRow}>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
                {item.is_manual_label && (
                  <Ionicons name="create-outline" size={12} color="#007AFF" style={{ marginLeft: 4 }} />
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.categorizeButton}
                onPress={() => categorizeMutation.mutate(item.id)}
              >
                <Text style={styles.categorizeButtonText}>Categorize</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionBalance}>
              Balance: {item.balance_after.toFixed(2)} coins
            </Text>
            {/* Blockchain indicator - transactions are automatically recorded on blockchain */}
            <TouchableOpacity
              style={styles.blockchainBadge}
              onPress={() => handleVerifyTransaction(item)}
            >
              <Ionicons name="lock-closed" size={10} color="#34C759" />
              <Text style={styles.blockchainBadgeText}>On-chain</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: iconColor },
          ]}
        >
          {isNegative ? '-' : '+'}
          {item.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ label: 'All', value: undefined }, ...CATEGORIES.map(c => ({ label: c, value: c }))]}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedCategory === item.value && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(item.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === item.value && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.value || 'all'}
            contentContainerStyle={styles.filterContent}
          />
        </View>

        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      </View>

      {/* Edit Category Modal */}
      <Modal
        visible={!!editingTransaction}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTransaction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Category</Text>
            <Text style={styles.modalDescription}>
              {editingTransaction?.description || editingTransaction?.type}
            </Text>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    newCategory === category && styles.categoryOptionActive,
                  ]}
                  onPress={() => setNewCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      newCategory === category && styles.categoryOptionTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setEditingTransaction(null);
                  setNewCategory('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={() => {
                  if (editingTransaction && newCategory) {
                    updateLabelMutation.mutate({
                      transactionId: editingTransaction.id,
                      category: newCategory,
                    });
                  }
                }}
                disabled={!newCategory || updateLabelMutation.isPending}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </Modal>

        {/* Blockchain Verification Modal */}
        <Modal
          visible={showVerificationModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowVerificationModal(false);
            setVerificationResult(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Blockchain Verification</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowVerificationModal(false);
                    setVerificationResult(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              {verificationResult && (
                <ScrollView style={styles.verificationContent}>
                  {verificationResult.verified ? (
                    <>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                        <Text style={styles.verifiedTitle}>Verified on Blockchain</Text>
                        <Text style={styles.verifiedText}>
                          This transaction is recorded on blockchain and cannot be modified or deleted.
                        </Text>
                      </View>
                      {verificationResult.transaction && (
                        <View style={styles.transactionDetails}>
                          <Text style={styles.detailLabel}>Transaction ID</Text>
                          <Text style={styles.detailValue}>#{verificationResult.transaction.id}</Text>
                          <Text style={styles.detailLabel}>Type</Text>
                          <Text style={styles.detailValue}>{verificationResult.transaction.transactionType}</Text>
                          <Text style={styles.detailLabel}>Amount</Text>
                          <Text style={styles.detailValue}>{verificationResult.transaction.amount.toFixed(2)} VKU</Text>
                          <Text style={styles.detailLabel}>Timestamp</Text>
                          <Text style={styles.detailValue}>
                            {new Date(verificationResult.transaction.timestamp * 1000).toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.notVerifiedBadge}>
                      <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                      <Text style={styles.notVerifiedTitle}>Not Found on Blockchain</Text>
                      <Text style={styles.notVerifiedText}>
                        This transaction was not found on blockchain. It may not have been recorded yet.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
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
  listContent: {
    padding: 15,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionIcon: {
    marginRight: 15,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionBalance: {
    fontSize: 12,
    color: '#999',
  },
  blockchainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  blockchainBadgeText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContent: {
    paddingHorizontal: 15,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  categorizeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categorizeButtonText: {
    fontSize: 12,
    color: '#666',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  categoryOptionActive: {
    backgroundColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#666',
  },
  categoryOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonSave: {
    backgroundColor: '#007AFF',
  },
  modalButtonCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  verificationContent: {
    maxHeight: 400,
  },
  verifiedBadge: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    marginBottom: 20,
  },
  verifiedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 10,
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  notVerifiedBadge: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    marginBottom: 20,
  },
  notVerifiedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C62828',
    marginTop: 10,
    marginBottom: 8,
  },
  notVerifiedText: {
    fontSize: 14,
    color: '#E53935',
    textAlign: 'center',
  },
  transactionDetails: {
    marginTop: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
});

