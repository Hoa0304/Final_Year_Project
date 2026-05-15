import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBlockchainStatus,
  getUserBlockchainAddress,
  getUserTokenBalance,
  getUserBlockchainTransactions,
  getBlockchainTransaction,
  BlockchainTransaction,
} from '../../services/blockchain.service';

export default function BlockchainScreen() {
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  // Fetch blockchain status
  const { data: status, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['blockchainStatus'],
    queryFn: getBlockchainStatus,
  });

  // Fetch user blockchain address
  const { data: address, isLoading: isLoadingAddress, refetch: refetchAddress } = useQuery({
    queryKey: ['blockchainAddress'],
    queryFn: getUserBlockchainAddress,
    enabled: status?.enabled === true,
  });

  // Fetch token balance
  const { data: balance, isLoading: isLoadingBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['blockchainBalance'],
    queryFn: getUserTokenBalance,
    enabled: status?.enabled === true,
  });

  // Fetch transaction IDs
  const { data: transactions, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['blockchainTransactions'],
    queryFn: getUserBlockchainTransactions,
    enabled: status?.enabled === true,
  });

  // Fetch selected transaction details
  const { data: txDetails, isLoading: isLoadingTxDetails } = useQuery({
    queryKey: ['blockchainTransaction', selectedTxId],
    queryFn: () => getBlockchainTransaction(selectedTxId!),
    enabled: status?.enabled === true && selectedTxId !== null,
  });

  function handleRefresh() {
    refetchStatus();
    refetchAddress();
    refetchBalance();
    refetchTransactions();
  }

  function handleViewTransaction(txId: number) {
    setSelectedTxId(txId);
  }

  function getTransactionTypeColor(type: string): string {
    if (type === 'spend' || type === 'revoke' || type === 'stock_loss') {
      return '#FF3B30';
    }
    return '#34C759';
  }

  function formatAddress(addr: string): string {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  if (isLoadingStatus) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading blockchain data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!status?.enabled) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.disabledContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
            <Text style={styles.disabledTitle}>Blockchain Not Enabled</Text>
            <Text style={styles.disabledText}>
              Blockchain integration is not configured.{'\n'}
              Contact administrator for more information.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isLoading = isLoadingAddress || isLoadingBalance || isLoadingTransactions;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={styles.statusTitle}>Blockchain Active</Text>
          </View>
          <Text style={styles.statusText}>{status?.message}</Text>
        </View>

        {/* Benefits Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Blockchain Protection</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="lock-closed" size={20} color="#34C759" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Immutable Records</Text>
              <Text style={styles.benefitDescription}>
                Transactions cannot be modified or deleted
              </Text>
            </View>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="eye-outline" size={20} color="#007AFF" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Transparency</Text>
              <Text style={styles.benefitDescription}>
                You can verify all your transactions anytime
              </Text>
            </View>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="shield-outline" size={20} color="#FF9500" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Tampering Detection</Text>
              <Text style={styles.benefitDescription}>
                Automatic detection of any unauthorized changes
              </Text>
            </View>
          </View>
        </View>

        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Blockchain Address</Text>
          </View>
          {isLoadingAddress ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : (
            <>
              <Text style={styles.addressText}>{address?.address || 'Loading...'}</Text>
              <Text style={styles.addressShort}>{formatAddress(address?.address || '')}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  if (address?.address) {
                    // In a real app, you'd copy to clipboard
                    Alert.alert('Address', address.address);
                  }
                }}
              >
                <Ionicons name="copy-outline" size={16} color="#007AFF" />
                <Text style={styles.copyButtonText}>Copy Address</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Balance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={24} color="#34C759" />
            <Text style={styles.cardTitle}>Token Balance</Text>
          </View>
          {isLoadingBalance ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : (
            <Text style={styles.balanceAmount}>{balance?.balance.toFixed(2) || '0.00'} HMall</Text>
          )}
          <Text style={styles.balanceLabel}>On-chain balance</Text>
        </View>

        {/* Transactions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={24} color="#FF9500" />
            <Text style={styles.cardTitle}>Blockchain Transactions</Text>
            {transactions && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{transactions.count}</Text>
              </View>
            )}
          </View>
          {isLoadingTransactions ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : transactions && transactions.transactionIds.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.transactionIds.slice(0, 10).map((txId) => (
                <TouchableOpacity
                  key={txId}
                  style={styles.transactionItem}
                  onPress={() => handleViewTransaction(txId)}
                >
                  <View style={styles.transactionItemLeft}>
                    <Ionicons name="receipt-outline" size={20} color="#666" />
                    <Text style={styles.transactionIdText}>TX #{txId}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))}
              {transactions.transactionIds.length > 10 && (
                <Text style={styles.moreText}>
                  +{transactions.transactionIds.length - 10} more transactions
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={32} color="#ccc" />
              <Text style={styles.emptyText}>No blockchain transactions yet</Text>
            </View>
          )}
        </View>

        {/* Transaction Details Modal */}
        {selectedTxId && txDetails && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Transaction Details</Text>
                <TouchableOpacity onPress={() => setSelectedTxId(null)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              {isLoadingTxDetails ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Transaction ID</Text>
                    <Text style={styles.detailValue}>#{txDetails.transaction.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: getTransactionTypeColor(txDetails.transaction.transactionType) },
                      ]}
                    >
                      {txDetails.transaction.transactionType}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: getTransactionTypeColor(txDetails.transaction.transactionType) },
                      ]}
                    >
                      {txDetails.transaction.amount.toFixed(2)} HMall
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Balance Before</Text>
                    <Text style={styles.detailValue}>{txDetails.transaction.balanceBefore.toFixed(2)} HMall</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Balance After</Text>
                    <Text style={styles.detailValue}>{txDetails.transaction.balanceAfter.toFixed(2)} HMall</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{txDetails.transaction.description || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Timestamp</Text>
                    <Text style={styles.detailValue}>{formatTimestamp(txDetails.transaction.timestamp)}</Text>
                  </View>
                  {txDetails.transaction.referenceType && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reference</Text>
                      <Text style={styles.detailValue}>
                        {txDetails.transaction.referenceType}: {formatAddress(txDetails.transaction.referenceId)}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </ScrollView>
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
  contentContainer: {
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 10,
  },
  disabledText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  addressText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#666',
    marginBottom: 4,
  },
  addressShort: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000',
    fontWeight: '600',
    marginBottom: 10,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
  copyButtonText: {
    marginLeft: 6,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  transactionsList: {
    marginTop: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIdText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  moreText: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalBody: {
    maxHeight: 400,
  },
  detailRow: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  benefitText: {
    flex: 1,
    marginLeft: 12,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});


