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
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Shopping', 'Electronics', 'Entertainment', 'Earnings', 'Investment', 'Food', 'Transportation', 'Bills', 'Reward', 'Other'];

export default function TransactionsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<CategorizedTransaction | null>(null);
  const [newCategory, setNewCategory] = useState('');
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
      return '#EF4444';
    }
    return '#10B981';
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
              Balance: {Math.round(item.balance_after).toLocaleString('en-US')} coins
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: iconColor },
          ]}
        >
          {isNegative ? '-' : '+'}
          {Math.round(item.amount).toLocaleString('en-US')}
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
  listContent: {
    padding: 15,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#F8FAFC',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionBalance: {
    fontSize: 12,
    color: '#94A3B8',
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
    color: '#64748B',
    marginTop: 15,
  },
  filterContainer: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  filterContent: {
    paddingHorizontal: 15,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#0ea5e920',
    borderColor: '#0ea5e9',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  categoryRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  categorizeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categorizeButtonText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#94A3B8',
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
    backgroundColor: '#1E293B',
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryOptionActive: {
    backgroundColor: '#0ea5e920',
    borderColor: '#0ea5e9',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  categoryOptionTextActive: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#1E293B',
  },
  modalButtonSave: {
    backgroundColor: '#0ea5e9',
  },
  modalButtonCancelText: {
    color: '#E2E8F0',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  verifiedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 10,
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 14,
    color: '#34D399',
    textAlign: 'center',
  },
  notVerifiedBadge: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  notVerifiedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 10,
    marginBottom: 8,
  },
  notVerifiedText: {
    fontSize: 14,
    color: '#F87171',
    textAlign: 'center',
  },
  transactionDetails: {
    marginTop: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '500',
  },
});

