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
import { translateCategory } from '../../utils/category.utils';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function PurchaseHistoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const categoryFilter = route.params?.category;

  const { data: purchases, isLoading, refetch } = useQuery({
    queryKey: ['purchaseHistory'],
    queryFn: () => getPurchaseHistory(100, 0),
  });

  const filteredPurchases = React.useMemo(() => {
    if (!purchases) return [];
    if (!categoryFilter) return purchases;
    
    const filterLower = categoryFilter.toLowerCase();

    // Map transaction categories to possible product categories/keywords/names
    const categoryMapping: Record<string, string[]> = {
      'điện tử': ['electronics', 'gadgets', 'phones', 'laptops', 'điện thoại', 'máy tính', 'điện tử', 'tech', 'laptop', 'smartphone', 'tablet', 'camera', 'keyboard', 'mouse', 'headphones'],
      'electronics': ['electronics', 'gadgets', 'phones', 'laptops', 'điện thoại', 'máy tính', 'điện tử', 'tech', 'laptop', 'smartphone', 'tablet', 'camera', 'keyboard', 'mouse', 'headphones'],
      'ăn uống': ['food', 'beverage', 'groceries', 'thực phẩm', 'đồ ăn', 'đồ uống', 'ăn uống', 'snack'],
      'food': ['food', 'beverage', 'groceries', 'thực phẩm', 'đồ ăn', 'đồ uống', 'ăn uống', 'snack'],
      'giải trí': ['entertainment', 'games', 'movies', 'giải trí', 'trò chơi', 'toys'],
      'entertainment': ['entertainment', 'games', 'movies', 'giải trí', 'trò chơi', 'toys'],
      'clothing': ['clothing', 'apparel', 'shoes', 'accessories', 'fashion', 'thời trang', 'quần áo', 'áo', 'quần'],
      'thời trang': ['clothing', 'apparel', 'shoes', 'accessories', 'fashion', 'thời trang', 'quần áo', 'áo', 'quần'],
      'đi lại': ['transport', 'vehicle', 'xe', 'đi lại', 'travel'],
      'transport': ['transport', 'vehicle', 'xe', 'đi lại', 'travel'],
      'education': ['education', 'course', 'book', 'khóa học', 'sách', 'giáo dục'],
      'giáo dục': ['education', 'course', 'book', 'khóa học', 'sách', 'giáo dục'],
      'shopping': ['shopping', 'mua sắm', 'retail', 'mouse', 'chuột', 'camera', 'máy ảnh', 'keyboard', 'bàn phím', 'headphones', 'tai nghe', 'watch', 'đồng hồ', 'tablet', 'máy tính bảng', 'laptop', 'máy tính xách tay', 'smartphone', 'điện thoại thông minh', 'clothing', 'thời trang', 'electronics', 'điện tử'],
      'mua sắm': ['shopping', 'mua sắm', 'retail', 'mouse', 'chuột', 'camera', 'máy ảnh', 'keyboard', 'bàn phím', 'headphones', 'tai nghe', 'watch', 'đồng hồ', 'tablet', 'máy tính bảng', 'laptop', 'máy tính xách tay', 'smartphone', 'điện thoại thông minh', 'clothing', 'thời trang', 'electronics', 'điện tử'],
    };

    const searchTerms = categoryMapping[filterLower];
    
    // If not mapped, do not filter out everything, just do a generic text search
    if (!searchTerms) {
      return purchases.filter(p => {
        const prodCat = (p.productCategory || '').toLowerCase();
        const prodName = (p.productName || '').toLowerCase();
        return prodCat.includes(filterLower) || prodName.includes(filterLower);
      });
    }
    
    const filtered = purchases.filter(p => {
      const prodCat = (p.productCategory || '').toLowerCase();
      const prodName = (p.productName || '').toLowerCase();
      
      return searchTerms.some(term => 
        prodCat.includes(term) || prodName.includes(term)
      );
    });

    return filtered;
  }, [purchases, categoryFilter]);

  function renderPurchase({ item }: { item: Purchase }) {
    const status = item.status;
    let statusText = 'Đã hoàn thành';
    let statusBadgeColor = '#10B981';
    let statusBgColor = '#10B98115';

    if (status === 'pending_payment') {
      statusText = 'Chờ thanh toán';
      statusBadgeColor = '#3B82F6';
      statusBgColor = '#3B82F615';
    } else if (status === 'pending') {
      statusText = 'Chờ xác nhận';
      statusBadgeColor = '#F59E0B';
      statusBgColor = '#F59E0B15';
    } else if (status === 'processing') {
      statusText = 'Đang xử lý';
      statusBadgeColor = '#8B5CF6';
      statusBgColor = '#8B5CF615';
    } else if (status === 'shipped' || status === 'out_for_delivery') {
      statusText = 'Đang giao';
      statusBadgeColor = '#06B6D4';
      statusBgColor = '#06B6D415';
    } else if (status === 'delivered') {
      statusText = 'Đã giao';
      statusBadgeColor = '#10B981';
      statusBgColor = '#10B98115';
    } else if (status === 'completed') {
      statusText = 'Đã hoàn thành';
      statusBadgeColor = '#10B981';
      statusBgColor = '#10B98115';
    } else if (status === 'cancelled') {
      statusText = 'Đã hủy';
      statusBadgeColor = '#EF4444';
      statusBgColor = '#EF444415';
    } else if (status === 'rejected') {
      statusText = 'Từ chối';
      statusBadgeColor = '#EF4444';
      statusBgColor = '#EF444415';
    }

    return (
      <TouchableOpacity
        style={styles.purchaseCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.purchaseDate}>
            {new Date(item.purchasedAt).toLocaleDateString('en-US', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
            <Text style={[styles.statusText, { color: statusBadgeColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.productRow}>
          {item.productImageUrl ? (
            <Image source={{ uri: item.productImageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={24} color="#64748B" />
            </View>
          )}
          <View style={styles.purchaseInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName}
            </Text>
            {item.productCategory && (
              <Text style={styles.productCategory}>{translateCategory(item.productCategory)}</Text>
            )}
            <Text style={styles.quantity}>x{item.quantity}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Tổng tiền</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.totalAmount}>{item.totalAmount.toLocaleString('vi-VN')} VND</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#0F172A', '#020617']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử mua hàng</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.container}>
        <FlatList keyboardShouldPersistTaps="handled"
          data={filteredPurchases}
          renderItem={renderPurchase}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-handle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {categoryFilter 
                  ? `Không có đơn hàng nào khớp với danh mục "${categoryFilter}".\nLưu ý: Giao dịch có thể không liên kết với một đơn hàng cụ thể.` 
                  : 'Chưa có lịch sử mua hàng'}
              </Text>
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
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  purchaseCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  purchaseDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  statusBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  purchaseInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  totalLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
});
