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
import { getStocks, Stock } from '../../services/stock.service';
import { Ionicons } from '@expo/vector-icons';

export default function StocksScreen() {
  const navigation = useNavigation();

  const { data: stocks, isLoading, refetch } = useQuery({
    queryKey: ['stocks'],
    queryFn: getStocks,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  function getPriceChangeColor(change: number) {
    if (change > 0) return '#34C759';
    if (change < 0) return '#FF3B30';
    return '#666';
  }

  function renderStock({ item }: { item: Stock }) {
    const priceChangeColor = getPriceChangeColor(item.price_change_percent);
    const isPositive = item.price_change_percent > 0;

    return (
      <TouchableOpacity
        style={styles.stockCard}
        onPress={() => (navigation as any).navigate('StockDetail', { stockId: item.id })}
      >
        <View style={styles.stockHeader}>
          <View>
            <Text style={styles.stockSymbol}>{item.symbol}</Text>
            <Text style={styles.stockName}>{item.name}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.stockPrice}>{item.current_price.toFixed(2)}</Text>
            <View style={[styles.changeContainer, { backgroundColor: priceChangeColor + '20' }]}>
              <Ionicons
                name={isPositive ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={priceChangeColor}
              />
              <Text style={[styles.changeText, { color: priceChangeColor }]}>
                {Math.abs(item.price_change_percent).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stock Market</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('Portfolio')}>
          <Text style={styles.portfolioLink}>My Portfolio</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={stocks}
        renderItem={renderStock}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No stocks available</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  portfolioLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  stockCard: {
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
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  priceContainer: {
    alignItems: 'flex-end',
  },
  stockPrice: {
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

