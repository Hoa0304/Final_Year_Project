import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getPurchaseHistory, Purchase } from '../../services/purchase-history.service';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PurchaseHistoryScreen() {
  const navigation = useNavigation();

  const { data: purchases, isLoading, refetch } = useQuery({
    queryKey: ['purchaseHistory'],
    queryFn: () => getPurchaseHistory(100, 0),
  });

  function renderPurchase({ item }: { item: Purchase }) {
    return (
      <TouchableOpacity
        style={styles.purchaseCard}
        onPress={() => (navigation as any).navigate('ProductDetail', { productId: item.productId })}
      >
        {item.productImageUrl ? (
          <Image source={{ uri: item.productImageUrl }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}
        <View style={styles.purchaseInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
          {item.productCategory && (
            <Text style={styles.productCategory}>{item.productCategory}</Text>
          )}
          <Text style={styles.purchaseDate}>
            {new Date(item.purchasedAt).toLocaleDateString()}
          </Text>
          <View style={styles.purchaseDetails}>
            <Text style={styles.quantity}>Qty: {item.quantity}</Text>
            <Text style={styles.totalAmount}>{item.totalAmount.toFixed(0)} coins</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={purchases}
          renderItem={renderPurchase}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No purchase history</Text>
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
  listContent: {
    padding: 15,
  },
  purchaseCard: {
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
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  purchaseInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  purchaseDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  purchaseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
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
});

























