import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getBalance, getTransactions } from '../../services/user.service';
import { getSpendingRecommendations, getInvestingRecommendations } from '../../services/recommendation.service';
import { getItemSuggestions } from '../../services/ai-suggestions.service';
import { getUnreadCount } from '../../services/notification.service';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch balance
  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['balance'],
    queryFn: getBalance,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent transactions
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: () => getTransactions(5, 0),
  });

  // Fetch recommendations - auto-refresh every 60 seconds
  const { data: spendingRecs, refetch: refetchSpendingRecs } = useQuery({
    queryKey: ['spendingRecommendations'],
    queryFn: getSpendingRecommendations,
    refetchInterval: 60000, // Refresh every 60 seconds
  });
  const { data: investingRecs, refetch: refetchInvestingRecs } = useQuery({
    queryKey: ['investingRecommendations'],
    queryFn: getInvestingRecommendations,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  // Fetch AI item suggestions based on transaction labels - auto-refresh every 60 seconds
  const { data: itemSuggestions, refetch: refetchItemSuggestions } = useQuery({
    queryKey: ['itemSuggestions'],
    queryFn: () => getItemSuggestions(5, true),
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  // Fetch unread notification count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: getUnreadCount,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  /**
   * Refresh all data including recommendations
   */
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      refetchBalance(), 
      refetchTransactions(),
      refetchSpendingRecs(),
      refetchInvestingRecs(),
      refetchItemSuggestions(),
    ]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.name}>{user?.fullName || user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => (navigation as any).navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#007AFF" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Virtual Balance</Text>
        <Text style={styles.balanceAmount}>{balance?.toFixed(2) || '0.00'} coins</Text>
        <View style={styles.balanceActions}>
        <TouchableOpacity
          style={styles.viewTransactionsButton}
          onPress={() => (navigation as any).navigate('Transactions')}
        >
          <Text style={styles.viewTransactionsText}>View Transactions</Text>
        </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTransactionsButton, styles.expenseManagementButton]}
            onPress={() => (navigation as any).navigate('ExpenseManagement')}
          >
            <Ionicons name="analytics-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.viewTransactionsText}>Expense Management</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('Marketplace')}
          >
            <Ionicons name="storefront" size={32} color="#007AFF" />
            <Text style={styles.actionText}>Marketplace</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('Tasks')}
          >
            <Ionicons name="checkmark-circle" size={32} color="#34C759" />
            <Text style={styles.actionText}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('Stocks')}
          >
            <Ionicons name="trending-up" size={32} color="#FF9500" />
            <Text style={styles.actionText}>Stocks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('Portfolio')}
          >
            <Ionicons name="pie-chart" size={32} color="#AF52DE" />
            <Text style={styles.actionText}>Portfolio</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Recommendations */}
      {spendingRecs && spendingRecs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Spending Recommendations</Text>
          {spendingRecs.slice(0, 2).map((rec, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recommendationCard}
              onPress={() => {
                if (rec.actionType === 'product' && rec.actionId) {
                  (navigation as any).navigate('ProductDetail', { productId: rec.actionId });
                } else if (rec.actionType === 'stock' && rec.actionId) {
                  (navigation as any).navigate('StockDetail', { stockId: rec.actionId });
                } else if (rec.actionType === 'task' && rec.actionId) {
                  // Navigate to games if it's a game recommendation
                  (navigation as any).navigate('Games');
                } else {
                  // Navigate to relevant screen based on action type
                  if (rec.actionType === 'task') {
                    (navigation as any).navigate('Tasks');
                  } else if (rec.actionType === 'product') {
                    (navigation as any).navigate('Marketplace');
                  } else if (rec.actionType === 'stock') {
                    (navigation as any).navigate('Stocks');
                  }
                }
              }}
            >
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationDesc}>{rec.description}</Text>
              <Text style={styles.confidenceText}>Confidence: {(rec.confidence * 100).toFixed(0)}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* AI Item Suggestions based on Transaction Labels */}
      {itemSuggestions && itemSuggestions.suggestions && itemSuggestions.suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Suggestions for You</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your transaction history and purchase patterns
          </Text>
          {itemSuggestions.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recommendationCard}
              onPress={() => {
                (navigation as any).navigate('ProductDetail', { productId: suggestion.productId });
              }}
            >
              <View style={styles.suggestionContent}>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.recommendationTitle}>{suggestion.productName}</Text>
                  <Text style={styles.recommendationDesc}>{suggestion.reason}</Text>
                  <Text style={styles.productPriceText}>
                    {suggestion.productPrice.toFixed(0)} coins
                  </Text>
                </View>
                <View style={styles.suggestionMeta}>
                  <Text style={styles.confidenceText}>
                    {(suggestion.confidence * 100).toFixed(0)}% match
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {itemSuggestions.basedOn && (
            <Text style={styles.suggestionFooter}>
              Based on {itemSuggestions.basedOn.transactionCount} transactions and{' '}
              {itemSuggestions.basedOn.purchaseCount} purchases
            </Text>
          )}
        </View>
      )}

      {investingRecs && investingRecs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Investment Recommendations</Text>
          {investingRecs.slice(0, 2).map((rec, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recommendationCard}
              onPress={() => {
                if (rec.actionType === 'stock' && rec.actionId) {
                  (navigation as any).navigate('StockDetail', { stockId: rec.actionId });
                } else if (rec.actionType === 'task' && rec.actionId) {
                  (navigation as any).navigate('Tasks');
                } else {
                  (navigation as any).navigate('Stocks');
                }
              }}
            >
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationDesc}>{rec.description}</Text>
              <Text style={styles.confidenceText}>Confidence: {(rec.confidence * 100).toFixed(0)}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Transactions')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {transactions && transactions.length > 0 ? (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc}>{transaction.description || transaction.type}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'spend' || transaction.type === 'revoke'
                    ? styles.negativeAmount
                    : styles.positiveAmount,
                ]}
              >
                {transaction.type === 'spend' || transaction.type === 'revoke' ? '-' : '+'}
                {transaction.amount.toFixed(2)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No transactions yet</Text>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceActions: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  viewTransactionsButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  expenseManagementButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  viewTransactionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  seeAllText: {
    color: '#007AFF',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  recommendationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#000',
  },
  recommendationDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  confidenceText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionMeta: {
    alignItems: 'flex-end',
  },
  productPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 5,
  },
  suggestionFooter: {
    fontSize: 11,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#34C759',
  },
  negativeAmount: {
    color: '#FF3B30',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
});

