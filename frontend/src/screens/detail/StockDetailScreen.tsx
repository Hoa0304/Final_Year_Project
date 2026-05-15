import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart } from 'react-native-chart-kit';
import { getStockById, buyStock, sellStock, getStockPriceHistory, getStockHolding } from '../../services/stock.service';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function StockDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { stockId } = route.params as { stockId: string };
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M'>('1D');

  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock', stockId],
    queryFn: () => getStockById(stockId),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: priceHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['stockPriceHistory', stockId, timeRange],
    queryFn: () => getStockPriceHistory(stockId, timeRange === '1D' ? 24 : timeRange === '1W' ? 50 : 100),
    enabled: !!stockId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: holding, isLoading: isLoadingHolding } = useQuery({
    queryKey: ['stockHolding', stockId],
    queryFn: () => getStockHolding(stockId),
    enabled: !!stockId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const chartData = useMemo(() => {
    // If no history, create sample data from current price
    if (!priceHistory || priceHistory.length === 0) {
      if (!stock) {
        return {
          labels: [],
          datasets: [
            {
              data: [],
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              strokeWidth: 2,
            },
          ],
        };
      }

      // Generate sample data points from current price
      const currentPrice = parseFloat(stock.current_price.toString());
      const sampleData: number[] = [];
      const sampleLabels: string[] = [];
      const now = new Date();
      
      // Generate 20 sample points with slight variations
      for (let i = 19; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000); // 1 minute intervals
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const price = currentPrice * (1 + variation);
        sampleData.push(Math.max(1, price));
        if (i % 3 === 0 || i === 0) {
          sampleLabels.push(`${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`);
        } else {
          sampleLabels.push('');
        }
      }

      const isPositive = stock.price_change_percent > 0;
      return {
        labels: sampleLabels,
        datasets: [
          {
            data: sampleData,
            color: (opacity = 1) => {
              const r = isPositive ? 52 : 255;
              const g = isPositive ? 199 : 59;
              const b = isPositive ? 89 : 48;
              return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            },
            strokeWidth: 3, // Increased for better visibility
          },
        ],
      };
    }

    const prices = priceHistory.map((item) => parseFloat(item.price.toString()));
    const labels = priceHistory.map((item, index) => {
      if (priceHistory.length <= 10) {
        const date = new Date(item.recorded_at);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      // Show only some labels for better readability
      if (index % Math.ceil(priceHistory.length / 6) === 0 || index === priceHistory.length - 1) {
        const date = new Date(item.recorded_at);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      return '';
    });

    const isPositive = stock?.price_change_percent && stock.price_change_percent > 0;
    
    // Calculate min and max for better scale visualization
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1; // 10% padding for better visualization

    return {
      labels,
      datasets: [
        {
          data: prices,
          color: (opacity = 1) => {
            const r = isPositive ? 52 : 255;
            const g = isPositive ? 199 : 59;
            const b = isPositive ? 89 : 48;
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          },
          strokeWidth: 3, // Increased from 2 to 3 for better visibility
          withGradient: true, // Enable gradient fill
        },
      ],
    };
  }, [priceHistory, stock]);

  const buyMutation = useMutation({
    mutationFn: buyStock,
    onSuccess: (data) => {
      Alert.alert('Success', data.message, [
        {
          text: 'OK',
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            queryClient.invalidateQueries({ queryKey: ['stockHolding', stockId] });
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to buy stock');
    },
  });

  const sellMutation = useMutation({
    mutationFn: sellStock,
    onSuccess: (data) => {
      Alert.alert('Success', data.message, [
        {
          text: 'OK',
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            queryClient.invalidateQueries({ queryKey: ['stockHolding', stockId] });
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to sell stock');
    },
  });

  function handleTransaction() {
    Keyboard.dismiss();
    if (!stock) return;
    if (quantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }

    // Validate sell quantity BEFORE showing confirmation
    if (action === 'sell') {
      if (!holding || holding.quantity === 0) {
        Alert.alert('Error', 'You do not own any shares of this stock');
        return;
      }
      if (quantity > holding.quantity) {
        Alert.alert('Error', `You only own ${holding.quantity} shares. Please reduce the quantity.`);
        // Reset quantity to max available
        setQuantity(holding.quantity);
        return;
      }
    }

    const totalAmount = stock.current_price * quantity;
    const actionText = action === 'buy' ? 'Buy' : 'Sell';
    
    let message = `${actionText} ${quantity} shares of ${stock.symbol} at ${stock.current_price.toFixed(2)} coins per share?\nTotal: ${totalAmount.toFixed(2)} coins`;
    
    if (action === 'sell' && holding) {
      const profit = (stock.current_price - holding.average_buy_price) * quantity;
      const profitPercent = ((stock.current_price - holding.average_buy_price) / holding.average_buy_price) * 100;
      message += `\n\nProfit: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)} coins (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)`;
    }

    Alert.alert(
      `Confirm ${actionText}`,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          onPress: () => {
            if (action === 'buy') {
              buyMutation.mutate({ stockId, quantity });
            } else {
              sellMutation.mutate({ stockId, quantity });
            }
          },
        },
      ]
    );
  }

  if (isLoading || !stock) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const priceChangeColor = stock.price_change_percent > 0 ? '#34C759' : '#FF3B30';

  // Check if user has holding for this stock
  const hasHolding = holding && holding.quantity > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>

      <View style={styles.header}>
        <Text style={styles.symbol}>{stock.symbol}</Text>
        <Text style={styles.name}>{stock.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{stock.current_price.toFixed(2)}</Text>
          <View style={[styles.changeContainer, { backgroundColor: priceChangeColor + '20' }]}>
            <Ionicons
              name={stock.price_change_percent > 0 ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={priceChangeColor}
            />
            <Text style={[styles.changeText, { color: priceChangeColor }]}>
              {Math.abs(stock.price_change_percent).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Price Chart */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Price Chart</Text>
          <View style={styles.timeRangeButtons}>
            {(['1D', '1W', '1M'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeButtonText,
                    timeRange === range && styles.timeRangeButtonTextActive,
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {isLoadingHistory && !stock ? (
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : stock && chartData.datasets[0].data.length > 0 ? (
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={250}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero={false}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: stock?.price_change_percent && stock.price_change_percent > 0 
                ? 'rgba(52, 199, 89, 0.15)' 
                : 'rgba(255, 59, 48, 0.15)',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 2,
              color: (opacity = 1) => {
                const isPositive = stock?.price_change_percent && stock.price_change_percent > 0;
                const r = isPositive ? 52 : 255;
                const g = isPositive ? 199 : 59;
                const b = isPositive ? 89 : 48;
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
              },
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '5',
                strokeWidth: '3',
                stroke: stock?.price_change_percent && stock.price_change_percent > 0 ? '#34C759' : '#FF3B30',
                fill: stock?.price_change_percent && stock.price_change_percent > 0 ? '#34C759' : '#FF3B30',
              },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: '#e0e0e0',
                strokeWidth: 1,
              },
              fillShadowGradient: stock?.price_change_percent && stock.price_change_percent > 0 
                ? '#34C759' 
                : '#FF3B30',
              fillShadowGradientOpacity: 0.25,
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withDots={chartData.datasets[0].data.length <= 30}
            withShadow={false}
            segments={4}
          />
        ) : (
          <View style={styles.chartEmptyContainer}>
            <Text style={styles.chartEmptyText}>Loading chart data...</Text>
          </View>
        )}
      </View>

      {/* Your Holdings */}
      {holding && (
        <View style={styles.holdingSection}>
          <Text style={styles.sectionTitle}>Your Holdings</Text>
          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Shares Owned:</Text>
              <Text style={styles.holdingValue}>{holding.quantity} shares</Text>
            </View>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Average Buy Price:</Text>
              <Text style={styles.holdingValue}>{holding.average_buy_price.toFixed(2)} coins</Text>
            </View>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Current Price:</Text>
              <Text style={styles.holdingValue}>{stock.current_price.toFixed(2)} coins</Text>
            </View>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Total Cost:</Text>
              <Text style={styles.holdingValue}>{holding.costBasis.toFixed(2)} coins</Text>
            </View>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Current Value:</Text>
              <Text style={styles.holdingValue}>{holding.currentValue.toFixed(2)} coins</Text>
            </View>
            <View style={[styles.holdingRow, styles.profitRow]}>
              <Text style={styles.holdingLabel}>Profit/Loss:</Text>
              <View style={styles.profitContainer}>
                <Ionicons
                  name={holding.profit >= 0 ? 'trending-up' : 'trending-down'}
                  size={18}
                  color={holding.profit >= 0 ? '#34C759' : '#FF3B30'}
                />
                <Text
                  style={[
                    styles.profitValue,
                    { color: holding.profit >= 0 ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {holding.profit >= 0 ? '+' : ''}
                  {holding.profit.toFixed(2)} coins ({holding.profitPercent >= 0 ? '+' : ''}
                  {holding.profitPercent.toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {stock.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{stock.description}</Text>
        </View>
      )}

      <View style={styles.actionSection}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, action === 'buy' && styles.actionButtonActive]}
            onPress={() => {
              setAction('buy');
              setQuantity(1);
            }}
          >
            <Text
              style={[styles.actionButtonText, action === 'buy' && styles.actionButtonTextActive]}
            >
              Buy
            </Text>
          </TouchableOpacity>
          {hasHolding && (
            <TouchableOpacity
              style={[styles.actionButton, action === 'sell' && styles.actionButtonActive]}
              onPress={() => {
                setAction('sell');
                setQuantity(1);
              }}
            >
              <Text
                style={[styles.actionButtonText, action === 'sell' && styles.actionButtonTextActive]}
              >
                Sell
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.quantityInput,
                action === 'sell' && holding && quantity > holding.quantity && styles.quantityInputError
              ]}
              value={quantity.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                if (action === 'sell' && holding) {
                  // For sell, limit to available quantity
                  const maxQuantity = holding.quantity;
                  const finalQuantity = Math.max(0, Math.min(num, maxQuantity));
                  setQuantity(finalQuantity);
                } else {
                  // For buy, allow any positive number
                  setQuantity(Math.max(1, num));
                }
              }}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => {
                // Validate on submit
                if (action === 'sell' && holding && quantity > holding.quantity) {
                  setQuantity(holding.quantity);
                  Alert.alert('Error', `Maximum ${holding.quantity} shares available`);
                }
                Keyboard.dismiss();
              }}
            />
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => {
                if (action === 'sell' && holding) {
                  const maxQuantity = holding.quantity;
                  if (quantity < maxQuantity) {
                    setQuantity(Math.min(quantity + 1, maxQuantity));
                  } else {
                    Alert.alert('Error', `Maximum ${maxQuantity} shares available`);
                  }
                } else {
                  setQuantity(quantity + 1);
                }
              }}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          {action === 'sell' && holding && (
            <View>
              <Text style={styles.maxQuantityText}>
                Max: {holding.quantity} shares available
              </Text>
              {quantity > holding.quantity && (
                <Text style={styles.errorText}>
                  Quantity exceeds available shares!
                </Text>
              )}
            </View>
          )}
        </View>

        <Text style={styles.totalPrice}>
          Total: {(stock.current_price * quantity).toFixed(2)} coins
        </Text>

        <TouchableOpacity
          style={[
            styles.transactionButton,
            action === 'buy' ? styles.buyButton : styles.sellButton,
            (buyMutation.isLoading || sellMutation.isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleTransaction}
          disabled={buyMutation.isLoading || sellMutation.isLoading}
        >
          {buyMutation.isLoading || sellMutation.isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.transactionButtonText}>
              {action === 'buy' ? 'Buy Stock' : 'Sell Stock'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  symbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  name: {
    fontSize: 18,
    color: '#666',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  chartSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLoadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyText: {
    fontSize: 14,
    color: '#999',
  },
  holdingSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  holdingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  profitRow: {
    borderBottomWidth: 0,
    paddingTop: 8,
    marginTop: 4,
  },
  holdingLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  holdingValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profitValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionSection: {
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  quantitySection: {
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000',
  },
  maxQuantityText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityInput: {
    width: 80,
    height: 50,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  quantityInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFE5E5',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  transactionButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#34C759',
  },
  sellButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  transactionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

