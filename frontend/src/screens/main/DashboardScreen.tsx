import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { getBalance, getTransactions } from '../../services/user.service';
import { getSpendingRecommendations } from '../../services/recommendation.service';
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
      refetchItemSuggestions(),
    ]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.fullName || user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => (navigation as any).navigate('Notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#F8FAFC" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
            progressBackgroundColor="#0F172A"
          />
        }
      >
        {/* Balance Card */}
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceCardHeader}>
            <Text style={styles.balanceLabel}>Shopee Coins Balance</Text>
          <Ionicons name="wallet-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
        </View>
        <Text style={styles.balanceAmount}>{Math.round(balance || 0).toLocaleString('en-US')} coins</Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.viewTransactionsButton}
              onPress={() => (navigation as any).navigate('Transactions')}
              activeOpacity={0.8}
            >
              <Ionicons name="list-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.viewTransactionsText}>Transactions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewTransactionsButton, styles.expenseManagementButton]}
              onPress={() => (navigation as any).navigate('ExpenseManagement')}
              activeOpacity={0.8}
            >
              <Ionicons name="analytics-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.viewTransactionsText}>Expenses</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => (navigation as any).navigate('Marketplace')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="storefront" size={24} color="#6366F1" />
              </View>
              <Text style={styles.actionText}>Marketplace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => (navigation as any).navigate('Tasks')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.actionText}>Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => (navigation as any).navigate('Chat')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="chatbubbles" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>AI Assistant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => (navigation as any).navigate('Social')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="people" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.actionText}>Discussions</Text>
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
                activeOpacity={0.8}
                onPress={() => {
                  if (rec.actionType === 'product' && rec.actionId) {
                    (navigation as any).navigate('ProductDetail', { productId: rec.actionId });
                  } else if (rec.actionType === 'stock' && rec.actionId) {
                    (navigation as any).navigate('Marketplace');
                  } else if (rec.actionType === 'task' && rec.actionId) {
                    (navigation as any).navigate('Tasks');
                  } else {
                    if (rec.actionType === 'task') {
                      (navigation as any).navigate('Tasks');
                    } else if (rec.actionType === 'product') {
                      (navigation as any).navigate('Marketplace');
                    } else if (rec.actionType === 'stock') {
                      (navigation as any).navigate('Marketplace');
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
                activeOpacity={0.8}
                onPress={() => {
                  (navigation as any).navigate('ProductDetail', { productId: suggestion.productId });
                }}
              >
                <View style={styles.suggestionContent}>
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.recommendationTitle}>{suggestion.productName}</Text>
                    <Text style={styles.recommendationDesc}>{suggestion.reason}</Text>
                    <Text style={styles.productPriceText}>
                      {suggestion.productPrice.toLocaleString('en-US')} VND
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



        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('Transactions')}
              activeOpacity={0.7}
            >
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
                  {Math.round(transaction.amount).toLocaleString('en-US')} coins
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
    backgroundColor: '#020617', // Dark background
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#020617',
  },
  greeting: {
    fontSize: 13,
    color: '#94A3B8', // slate-400
    fontWeight: '500',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC', // slate-50
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#020617',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  balanceCard: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  balanceActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  viewTransactionsButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  expenseManagementButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewTransactionsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: -8,
    marginBottom: 16,
  },
  seeAllText: {
    color: '#818CF8', // indigo-400
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  recommendationCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#F8FAFC',
  },
  recommendationDesc: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 20,
  },
  confidenceText: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: '700',
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  suggestionInfo: {
    flex: 1,
    marginRight: 8,
  },
  suggestionMeta: {
    alignItems: 'flex-end',
  },
  productPriceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34D399', // emerald-400
    marginTop: 6,
  },
  suggestionFooter: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#10B981', // emerald-500
  },
  negativeAmount: {
    color: '#EF4444', // red-500
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    padding: 20,
    fontSize: 14,
  },
});


