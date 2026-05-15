import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getPortfolio, PortfolioItem } from '../../services/stock.service';
import { Ionicons } from '@expo/vector-icons';

export default function PortfolioScreen() {
  const navigation = useNavigation();

  const { data: portfolio, isLoading, refetch } = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
  });

  function getProfitColor(profit: number) {
    if (profit > 0) return '#34C759';
    if (profit < 0) return '#FF3B30';
    return '#666';
  }

  function renderPortfolioItem({ item }: { item: PortfolioItem }) {
    const profitColor = getProfitColor(item.profit);

    return (
      <TouchableOpacity
        style={styles.portfolioCard}
        onPress={() => (navigation as any).navigate('StockDetail', { stockId: item.stocks.id })}
      >
        <View style={styles.portfolioHeader}>
          <View>
            <Text style={styles.stockSymbol}>{item.stocks.symbol}</Text>
            <Text style={styles.stockName}>{item.stocks.name}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.currentPrice}>{item.stocks.current_price.toFixed(2)}</Text>
            <View style={[styles.changeContainer, { backgroundColor: profitColor + '20' }]}>
              <Ionicons
                name={item.profit > 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={profitColor}
              />
              <Text style={[styles.changeText, { color: profitColor }]}>
                {item.stocks.price_change_percent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.portfolioDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{item.quantity} shares</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Avg. Buy Price:</Text>
            <Text style={styles.detailValue}>{item.average_buy_price.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Value:</Text>
            <Text style={styles.detailValue}>{item.currentValue.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Profit/Loss:</Text>
            <Text style={[styles.detailValue, { color: profitColor }]}>
              {item.profit >= 0 ? '+' : ''}
              {item.profit.toFixed(2)} ({item.profitPercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const totalValue = portfolio?.reduce((sum, item) => sum + item.currentValue, 0) || 0;
  const totalCost = portfolio?.reduce((sum, item) => sum + item.costBasis, 0) || 0;
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Portfolio Summary</Text>
        <Text style={styles.summaryValue}>Total Value: {totalValue.toFixed(2)} coins</Text>
        <Text style={styles.summaryValue}>Total Cost: {totalCost.toFixed(2)} coins</Text>
        <Text
          style={[
            styles.summaryProfit,
            { color: getProfitColor(totalProfit) },
          ]}
        >
          Total P/L: {totalProfit >= 0 ? '+' : ''}
          {totalProfit.toFixed(2)} ({totalProfitPercent.toFixed(2)}%)
        </Text>
      </View>

      <FlatList
        data={portfolio}
        renderItem={renderPortfolioItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No stocks in portfolio</Text>
            <Text style={styles.emptySubtext}>Start investing to build your portfolio</Text>
          </View>
        }
      />
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
  summaryCard: {
    backgroundColor: '#007AFF',
    padding: 20,
    margin: 15,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  summaryValue: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    opacity: 0.9,
  },
  summaryProfit: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  listContent: {
    padding: 15,
  },
  portfolioCard: {
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
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  stockSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  stockName: {
    fontSize: 14,
    color: '#666',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  portfolioDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});

