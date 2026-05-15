import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getExpenseStatistics, getExpenseInsights, ExpenseInsight } from '../../services/transaction-label.service';
import { getBudgetProgress, setUserBudget, getSavingsGoals, createSavingsGoal, BudgetProgress, SavingsGoal } from '../../services/budget.service';
import { useNavigation } from '@react-navigation/native';

type Period = 'day' | 'week' | 'month' | 'year';

export default function ExpenseManagementScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [savingsGoalTitle, setSavingsGoalTitle] = useState('');
  const [savingsGoalAmount, setSavingsGoalAmount] = useState('');

  // Fetch expense statistics
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['expenseStatistics', selectedPeriod],
    queryFn: () => getExpenseStatistics(selectedPeriod),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch AI expense insights
  const { data: insightsData, refetch: refetchInsights } = useQuery({
    queryKey: ['expenseInsights', selectedPeriod],
    queryFn: () => getExpenseInsights(selectedPeriod),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });

  // Fetch budget progress
  const budgetPeriod = selectedPeriod === 'month' ? 'monthly' : selectedPeriod === 'week' ? 'weekly' : 'daily';
  const { data: budgetProgress, refetch: refetchBudget } = useQuery({
    queryKey: ['budgetProgress', budgetPeriod],
    queryFn: () => getBudgetProgress(budgetPeriod),
    refetchInterval: 30000,
  });

  // Fetch savings goals
  const { data: savingsGoalsData, refetch: refetchSavingsGoals } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: async () => {
      const result = await getSavingsGoals(false);
      return result;
    },
  });

  // Set budget mutation
  const setBudgetMutation = useMutation({
    mutationFn: (amount: number) => setUserBudget(budgetPeriod, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetProgress'] });
      setShowBudgetModal(false);
      setBudgetAmount('');
      Alert.alert('Success', 'Budget set successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to set budget');
    },
  });

  // Create savings goal mutation
  const createSavingsGoalMutation = useMutation({
    mutationFn: (data: { title: string; targetAmount: number; description?: string }) =>
      createSavingsGoal(data.title, data.targetAmount, data.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
      setShowSavingsGoalModal(false);
      setSavingsGoalTitle('');
      setSavingsGoalAmount('');
      Alert.alert('Success', 'Savings goal created!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create savings goal');
    },
  });

  /**
   * Handle pull to refresh
   */
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchInsights(), refetchBudget(), refetchSavingsGoals()]);
    setRefreshing(false);
  }

  /**
   * Handle set budget from AI insight
   */
  function handleSetBudget(amount?: number) {
    if (amount) {
      setBudgetAmount(amount.toFixed(2));
    }
    setShowBudgetModal(true);
  }

  /**
   * Handle create savings goal
   */
  function handleCreateSavingsGoal() {
    setShowSavingsGoalModal(true);
  }

  /**
   * Handle action from AI insight
   */
  function handleInsightAction(insight: ExpenseInsight) {
    switch (insight.actionType) {
      case 'budget':
        handleSetBudget(insight.amount);
        break;
      case 'save':
        handleCreateSavingsGoal();
        break;
      case 'reduce':
        if (insight.category) {
          (navigation as any).navigate('Transactions', { category: insight.category });
        } else {
          (navigation as any).navigate('Transactions');
        }
        break;
      case 'earn':
        (navigation as any).navigate('Tasks');
        break;
      case 'diversify':
        (navigation as any).navigate('Marketplace');
        break;
      default:
        break;
    }
  }

  /**
   * Render period selector
   */
  function renderPeriodSelector() {
    const periods: { label: string; value: Period }[] = [
      { label: 'Today', value: 'day' },
      { label: 'This Week', value: 'week' },
      { label: 'This Month', value: 'month' },
      { label: 'This Year', value: 'year' },
    ];

    return (
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodButton,
              selectedPeriod === period.value && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.value)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period.value && styles.periodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  /**
   * Render summary cards
   */
  function renderSummary() {
    if (!stats) return null;

    const { summary } = stats;

    return (
      <View style={styles.summaryContainer}>
        {/* Total Spending */}
        <View style={[styles.summaryCard, styles.spendingCard]}>
          <View style={styles.summaryCardHeader}>
            <Ionicons name="arrow-up-circle" size={24} color="#FF3B30" />
            <Text style={styles.summaryCardLabel}>Total Spending</Text>
          </View>
          <Text style={styles.summaryCardAmount}>
            {summary.totalSpending.toFixed(2)} coins
          </Text>
          <Text style={styles.summaryCardSubtext}>
            {summary.transactionCount} transactions
          </Text>
        </View>

        {/* Total Earnings */}
        <View style={[styles.summaryCard, styles.earningCard]}>
          <View style={styles.summaryCardHeader}>
            <Ionicons name="arrow-down-circle" size={24} color="#34C759" />
            <Text style={styles.summaryCardLabel}>Total Earnings</Text>
          </View>
          <Text style={styles.summaryCardAmount}>
            {summary.totalEarnings.toFixed(2)} coins
          </Text>
        </View>

        {/* Net Amount */}
        <View
          style={[
            styles.summaryCard,
            summary.netAmount >= 0 ? styles.netPositiveCard : styles.netNegativeCard,
          ]}
        >
          <View style={styles.summaryCardHeader}>
            <Ionicons
              name={summary.netAmount >= 0 ? 'trending-up' : 'trending-down'}
              size={24}
              color={summary.netAmount >= 0 ? '#34C759' : '#FF3B30'}
            />
            <Text style={styles.summaryCardLabel}>Net Amount</Text>
          </View>
          <Text
            style={[
              styles.summaryCardAmount,
              {
                color: summary.netAmount >= 0 ? '#34C759' : '#FF3B30',
              },
            ]}
          >
            {summary.netAmount >= 0 ? '+' : ''}
            {summary.netAmount.toFixed(2)} coins
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Render budget progress card
   */
  function renderBudgetProgress() {
    if (!budgetProgress || !budgetProgress.budget) return null;

    const { budget, spent, remaining, percentage } = budgetProgress;
    const isOverBudget = percentage >= 100;
    const isWarning = percentage >= 80;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Budget Progress</Text>
          <TouchableOpacity onPress={() => handleSetBudget()}>
            <Ionicons name="settings-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <View>
              <Text style={styles.budgetLabel}>
                {budget.budget_type.charAt(0).toUpperCase() + budget.budget_type.slice(1)} Budget
              </Text>
              <Text style={styles.budgetAmount}>{budget.amount.toFixed(2)} coins</Text>
            </View>
            <View style={[styles.budgetPercentageBadge, { backgroundColor: isOverBudget ? '#FF3B30' : isWarning ? '#FF9500' : '#34C759' }]}>
              <Text style={styles.budgetPercentageText}>{percentage.toFixed(0)}%</Text>
            </View>
          </View>
          <View style={styles.budgetProgressBar}>
            <View
              style={[
                styles.budgetProgressFill,
                {
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: isOverBudget ? '#FF3B30' : isWarning ? '#FF9500' : '#34C759',
                },
              ]}
            />
          </View>
          <View style={styles.budgetDetails}>
            <View style={styles.budgetDetailItem}>
              <Text style={styles.budgetDetailLabel}>Spent</Text>
              <Text style={[styles.budgetDetailValue, { color: '#FF3B30' }]}>
                {spent.toFixed(2)} coins
              </Text>
            </View>
            <View style={styles.budgetDetailItem}>
              <Text style={styles.budgetDetailLabel}>Remaining</Text>
              <Text style={[styles.budgetDetailValue, { color: remaining > 0 ? '#34C759' : '#FF3B30' }]}>
                {remaining.toFixed(2)} coins
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  /**
   * Render savings goals
   */
  function renderSavingsGoals() {
    if (!savingsGoalsData || !savingsGoalsData.goals || savingsGoalsData.goals.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          <TouchableOpacity onPress={handleCreateSavingsGoal}>
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {savingsGoalsData.goals.map((goal) => {
          const progress = (goal.current_amount / goal.target_amount) * 100;
          return (
            <View key={goal.id} style={styles.savingsGoalCard}>
              <View style={styles.savingsGoalHeader}>
                <Text style={styles.savingsGoalTitle}>{goal.title}</Text>
                <Text style={styles.savingsGoalProgress}>
                  {progress.toFixed(0)}%
                </Text>
              </View>
              {goal.description && (
                <Text style={styles.savingsGoalDescription}>{goal.description}</Text>
              )}
              <View style={styles.savingsGoalProgressBar}>
                <View
                  style={[
                    styles.savingsGoalProgressFill,
                    { width: `${Math.min(progress, 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.savingsGoalAmounts}>
                <Text style={styles.savingsGoalCurrent}>
                  {goal.current_amount.toFixed(2)} / {goal.target_amount.toFixed(2)} coins
                </Text>
                {goal.target_date && (
                  <Text style={styles.savingsGoalDate}>
                    Target: {new Date(goal.target_date).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  /**
   * Render top categories
   */
  function renderTopCategories() {
    if (!stats || !stats.topCategories || stats.topCategories.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No spending data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Spending Categories</Text>
        {stats.topCategories.map((category, index) => (
          <View key={category.category} style={styles.categoryItem}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryRank}>
                <Text style={styles.categoryRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.category}</Text>
                <Text style={styles.categoryCount}>{category.count} transactions</Text>
              </View>
              <View style={styles.categoryAmountContainer}>
                <Text style={styles.categoryAmount}>
                  {category.amount.toFixed(2)} coins
                </Text>
                <Text style={styles.categoryPercentage}>
                  {category.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${category.percentage}%`,
                    backgroundColor: getCategoryColor(index),
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  /**
   * Get color for category based on index
   */
  function getCategoryColor(index: number): string {
    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'];
    return colors[index % colors.length];
  }

  /**
   * Render daily trend (simplified - just show last 7 days)
   */
  function renderDailyTrend() {
    if (!stats || !stats.dailyTrend || stats.dailyTrend.length === 0) {
      return null;
    }

    // Get last 7 days
    const last7Days = stats.dailyTrend.slice(-7);
    const maxAmount = Math.max(...last7Days.map((d) => d.amount), 1);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Spending Trend (Last 7 Days)</Text>
        <View style={styles.trendContainer}>
          {last7Days.map((day, index) => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const height = (day.amount / maxAmount) * 100;

            return (
              <View key={day.date} style={styles.trendBarContainer}>
                <View style={styles.trendBarWrapper}>
                  <View
                    style={[
                      styles.trendBar,
                      {
                        height: `${Math.max(height, 5)}%`,
                        backgroundColor: '#007AFF',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.trendBarLabel}>{dayName}</Text>
                <Text style={styles.trendBarAmount}>
                  {day.amount.toFixed(0)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  /**
   * Render category breakdown details
   */
  function renderCategoryBreakdown() {
    if (!stats || !stats.categoryBreakdown) return null;

    const categories = Object.entries(stats.categoryBreakdown);

    if (categories.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('Transactions')}
          >
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {categories.slice(0, 5).map(([category, data]) => (
          <TouchableOpacity
            key={category}
            style={styles.breakdownItem}
            onPress={() => {
              // Navigate to transactions filtered by category
              (navigation as any).navigate('Transactions', { category });
            }}
          >
            <View style={styles.breakdownInfo}>
              <Text style={styles.breakdownCategory}>{category}</Text>
              <Text style={styles.breakdownCount}>
                {data.count} transaction{data.count !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.breakdownAmountContainer}>
              <Text style={styles.breakdownAmount}>
                {data.amount.toFixed(2)} coins
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  /**
   * Get color for insight type
   */
  function getInsightColor(type: string): string {
    switch (type) {
      case 'warning':
        return '#FF9500';
      case 'alert':
        return '#FF3B30';
      case 'suggestion':
        return '#007AFF';
      case 'insight':
        return '#34C759';
      case 'tip':
        return '#AF52DE';
      default:
        return '#666';
    }
  }

  /**
   * Get icon for insight type
   */
  function getInsightIcon(type: string): keyof typeof Ionicons.glyphMap {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'alert':
        return 'alert-circle';
      case 'suggestion':
        return 'bulb';
      case 'insight':
        return 'analytics';
      case 'tip':
        return 'star';
      default:
        return 'information-circle';
    }
  }

  /**
   * Get color for priority
   */
  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#666';
    }
  }

  /**
   * Get action label
   */
  function getActionLabel(actionType?: string): string {
    switch (actionType) {
      case 'budget':
        return 'set budget';
      case 'save':
        return 'create savings goal';
      case 'reduce':
        return 'view transactions';
      case 'earn':
        return 'earn coins';
      case 'diversify':
        return 'explore marketplace';
      default:
        return 'take action';
    }
  }

  /**
   * Render AI insights and recommendations
   */
  function renderAIInsights() {
    if (!insightsData || !insightsData.insights || insightsData.insights.length === 0) {
      return null;
    }

    const { insights, prediction } = insightsData;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>AI Insights & Recommendations</Text>
          </View>
        </View>

        {/* Spending Prediction */}
        {prediction && prediction.confidence > 0.3 && (
          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Ionicons 
                name={prediction.trend === 'increasing' ? 'trending-up' : prediction.trend === 'decreasing' ? 'trending-down' : 'remove'} 
                size={20} 
                color={prediction.trend === 'increasing' ? '#FF3B30' : prediction.trend === 'decreasing' ? '#34C759' : '#666'} 
              />
              <Text style={styles.predictionTitle}>Next 7 Days Prediction</Text>
            </View>
            <Text style={styles.predictionAmount}>
              {prediction.predictedAmount.toFixed(2)} coins
            </Text>
            <Text style={styles.predictionTrend}>
              Trend: {prediction.trend} • Confidence: {(prediction.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        {/* Insights List */}
        {insights.map((insight, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.insightCard,
              {
                borderLeftColor: getInsightColor(insight.type),
                borderLeftWidth: 4,
              },
            ]}
            onPress={() => handleInsightAction(insight)}
            activeOpacity={0.7}
          >
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: getInsightColor(insight.type) + '20' }]}>
                <Ionicons
                  name={getInsightIcon(insight.type)}
                  size={20}
                  color={getInsightColor(insight.type)}
                />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightMessage}>{insight.message}</Text>
                {insight.amount && (
                  <Text style={styles.insightAmount}>
                    Amount: {insight.amount.toFixed(2)} coins
                  </Text>
                )}
                {insight.actionType && (
                  <View style={styles.insightActionHint}>
                    <Ionicons name="arrow-forward-circle" size={16} color={getInsightColor(insight.type)} />
                    <Text style={[styles.insightActionText, { color: getInsightColor(insight.type) }]}>
                      Tap to {getActionLabel(insight.actionType)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(insight.priority) }]}>
                <Text style={styles.priorityText}>{insight.priority.toUpperCase()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Management</Text>
      </View>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Management</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Loading State */}
        {isLoading && !stats && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading expense data...</Text>
          </View>
        )}

        {/* Summary Cards */}
        {renderSummary()}

        {/* Budget Progress */}
        {renderBudgetProgress()}

        {/* Savings Goals */}
        {renderSavingsGoals()}

        {/* Top Categories */}
        {renderTopCategories()}

        {/* Daily Trend */}
        {renderDailyTrend()}

        {/* Category Breakdown */}
        {renderCategoryBreakdown()}

        {/* AI Insights & Recommendations */}
        {renderAIInsights()}
      </ScrollView>

      {/* Set Budget Modal */}
      <Modal
        visible={showBudgetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Budget</Text>
              <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Budget Amount (coins)</Text>
            <TextInput
              style={styles.modalInput}
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              placeholder="Enter budget amount"
              placeholderTextColor="#999"
              keyboardType="numeric"
              color="#000"
            />
            <Text style={styles.modalHint}>
              Period: {budgetPeriod.charAt(0).toUpperCase() + budgetPeriod.slice(1)}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                const amount = parseFloat(budgetAmount);
                if (amount > 0) {
                  setBudgetMutation.mutate(amount);
                } else {
                  Alert.alert('Error', 'Please enter a valid amount');
                }
              }}
              disabled={setBudgetMutation.isPending}
            >
              <Text style={styles.modalButtonText}>
                {setBudgetMutation.isPending ? 'Setting...' : 'Set Budget'}
              </Text>
            </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Savings Goal Modal */}
      <Modal
        visible={showSavingsGoalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSavingsGoalModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Create Savings Goal</Text>
                    <TouchableOpacity onPress={() => setShowSavingsGoalModal(false)}>
                      <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalBody}>
                    <Text style={styles.modalLabel}>Goal Title</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={savingsGoalTitle}
                      onChangeText={setSavingsGoalTitle}
                      placeholder="e.g., Save for new product"
                      placeholderTextColor="#999"
                      color="#000"
                      returnKeyType="next"
                    />
                    
                    <Text style={styles.modalLabel}>Target Amount (coins)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={savingsGoalAmount}
                      onChangeText={setSavingsGoalAmount}
                      placeholder="Enter target amount"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      color="#000"
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const amount = parseFloat(savingsGoalAmount);
                        if (savingsGoalTitle && amount > 0) {
                          createSavingsGoalMutation.mutate({
                            title: savingsGoalTitle,
                            targetAmount: amount,
                          });
                        } else {
                          Alert.alert('Error', 'Please fill all fields');
                        }
                      }}
                    />
                    
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonPrimary]}
                      onPress={() => {
                        const amount = parseFloat(savingsGoalAmount);
                        if (savingsGoalTitle && amount > 0) {
                          createSavingsGoalMutation.mutate({
                            title: savingsGoalTitle,
                            targetAmount: amount,
                          });
                        } else {
                          Alert.alert('Error', 'Please fill all fields');
                        }
                      }}
                      disabled={createSavingsGoalMutation.isPending}
                    >
                      <Text style={styles.modalButtonText}>
                        {createSavingsGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  earningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  netPositiveCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  netNegativeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryCardLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  summaryCardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  summaryCardSubtext: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
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
    color: '#000',
    marginBottom: 15,
  },
  seeAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryItem: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
  },
  categoryAmountContainer: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#666',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingVertical: 10,
  },
  trendBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  trendBarWrapper: {
    width: '80%',
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  trendBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  trendBarLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  trendBarAmount: {
    fontSize: 10,
    color: '#999',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  breakdownCount: {
    fontSize: 12,
    color: '#666',
  },
  breakdownAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
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
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predictionCard: {
    backgroundColor: '#F0F8FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  predictionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  predictionAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  predictionTrend: {
    fontSize: 12,
    color: '#666',
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  insightAmount: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  insightActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  insightActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  budgetCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  budgetPercentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  budgetPercentageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  budgetProgressBar: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 15,
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  budgetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetDetailItem: {
    flex: 1,
  },
  budgetDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  budgetDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  savingsGoalCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  savingsGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savingsGoalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  savingsGoalProgress: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  savingsGoalDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  savingsGoalProgressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  savingsGoalProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  savingsGoalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsGoalCurrent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  savingsGoalDate: {
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
    maxHeight: '90%',
    width: '100%',
  },
  modalBody: {
    paddingTop: 10,
    width: '100%',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  modalHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

