import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getProducts, getCategories, Product, ProductFilters } from '../../services/product.service';
import { getCart } from '../../services/shopping-cart.service';
import { getUnreadCount } from '../../services/notification.service';
import { searchVendors, getVendorsByIds, Vendor } from '../../services/vendor.service';
import { getMLRecommendations, MLRecommendation } from '../../services/recommendation.service';
import { getEthRate } from '../../services/order.service';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/StarRating';
import { LinearGradient } from 'expo-linear-gradient';

type SortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
type ViewMode = 'grid' | 'list';
type MarketplaceTab = 'all' | 'vendors';

export default function MarketplaceScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<MarketplaceTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Build filters object
  const filters: ProductFilters = useMemo(() => {
    const filterObj: ProductFilters = {
      category: selectedCategory,
      search: searchQuery || undefined,
      sortBy,
      inStock: inStockOnly || undefined,
    };

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) filterObj.minPrice = min;
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) filterObj.maxPrice = max;
    }

    return filterObj;
  }, [selectedCategory, searchQuery, sortBy, minPrice, maxPrice, inStockOnly]);

  // Fetch ETH Rate
  const { data: ethRateData } = useQuery({
    queryKey: ['ethRate'],
    queryFn: getEthRate,
    staleTime: 5 * 60 * 1000, // 5 min
  });
  const ethRate = ethRateData?.rate || 85000000;
  // Exchange rate: 1 coin = 1000 VND (fixed)
  const COIN_TO_VND = 1000;

  // Fetch products - when on vendors tab, fetch all products to group by vendor
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', activeTab === 'vendors' ? {} : filters],
    queryFn: () => getProducts(activeTab === 'vendors' ? {} : filters),
  });

  // Fetch vendors for "By Vendor" tab - fetch all vendors to match with products
  // Use a large limit to get all vendors
  const { data: vendors = [], isLoading: isLoadingVendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => searchVendors(undefined, 1000), // Fetch up to 1000 vendors
    enabled: activeTab === 'vendors',
  });

  // Group products by vendor when on vendors tab - only show top 4 rated products per vendor
  const productsByVendor = useMemo(() => {
    if (activeTab !== 'vendors' || !products) return {};

    const grouped: Record<string, Product[]> = {};
    products.forEach((product) => {
      const vendorId = product.created_by || 'unknown';
      if (!grouped[vendorId]) {
        grouped[vendorId] = [];
      }
      grouped[vendorId].push(product);
    });

    // Sort and limit to top 4 rated products per vendor
    Object.keys(grouped).forEach((vendorId) => {
      const vendorProducts = grouped[vendorId];
      // Sort by averageRating (descending), then by totalRatings (descending)
      vendorProducts.sort((a, b) => {
        const ratingA = a.averageRating || 0;
        const ratingB = b.averageRating || 0;
        const totalA = a.totalRatings || 0;
        const totalB = b.totalRatings || 0;

        // First sort by rating, then by number of ratings
        if (ratingA !== ratingB) {
          return ratingB - ratingA;
        }
        return totalB - totalA;
      });

      // Keep only top 4
      grouped[vendorId] = vendorProducts.slice(0, 4);
    });

    return grouped;
  }, [products, activeTab]);

  // Filter vendors by search query
  const filteredVendors = useMemo(() => {
    if (activeTab !== 'vendors' || !vendors || vendors.length === 0) return [];
    if (!searchQuery || searchQuery.trim() === '') return vendors;
    const query = searchQuery.toLowerCase().trim();
    return vendors.filter((vendor) => {
      const name = (vendor.full_name || '').toLowerCase();
      const email = (vendor.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [vendors, searchQuery, activeTab]);

  // Get unique vendor IDs from products that are not in the vendors list
  const missingVendorIds = useMemo(() => {
    if (activeTab !== 'vendors' || !products) return [];
    const uniqueVendorIds = new Set<string>();

    // Get unique vendor IDs from products
    products.forEach((product) => {
      if (product.created_by) {
        uniqueVendorIds.add(product.created_by);
      }
    });

    // Find vendor IDs that are not in the vendors list
    const vendorIdsInList = new Set((vendors || []).map(v => v.id));
    return Array.from(uniqueVendorIds).filter(id => !vendorIdsInList.has(id));
  }, [products, vendors, activeTab]);

  // Fetch vendor info for missing vendor IDs
  const { data: missingVendors = [] } = useQuery({
    queryKey: ['vendors-by-ids', missingVendorIds],
    queryFn: () => getVendorsByIds(missingVendorIds),
    enabled: activeTab === 'vendors' && missingVendorIds.length > 0,
  });

  // Create vendor map from products - combine vendors list and missing vendors
  const vendorMapFromProducts = useMemo(() => {
    if (activeTab !== 'vendors' || !products) return new Map<string, Vendor>();
    const map = new Map<string, Vendor>();
    const uniqueVendorIds = new Set<string>();

    // Get unique vendor IDs from products
    products.forEach((product) => {
      if (product.created_by) {
        uniqueVendorIds.add(product.created_by);
      }
    });

    // Add vendors from vendors list
    (vendors || []).forEach((vendor) => {
      if (uniqueVendorIds.has(vendor.id)) {
        map.set(vendor.id, vendor);
      }
    });

    // Add missing vendors that were fetched
    (missingVendors || []).forEach((vendor) => {
      if (uniqueVendorIds.has(vendor.id)) {
        map.set(vendor.id, vendor);
      }
    });

    return map;
  }, [products, vendors, missingVendors, activeTab]);

  // Filter productsByVendor by filtered vendors
  // Show all vendors that have products, even if they're not in the vendors list yet
  const filteredProductsByVendor = useMemo(() => {
    if (activeTab !== 'vendors') return {};
    const filtered: Record<string, Product[]> = {};
    Object.keys(productsByVendor).forEach((vendorId) => {
      const vendorProducts = productsByVendor[vendorId];
      // Only show vendors that have at least 1 product
      if (vendorProducts && vendorProducts.length > 0) {
        // If search is active, check if vendor matches search
        if (searchQuery && searchQuery.trim() !== '') {
          const vendor = (filteredVendors || []).find((v) => v.id === vendorId) || vendorMapFromProducts.get(vendorId);
          if (vendor) {
            const name = (vendor.full_name || '').toLowerCase();
            const email = (vendor.email || '').toLowerCase();
            const query = searchQuery.toLowerCase().trim();
            if (name.includes(query) || email.includes(query)) {
              filtered[vendorId] = vendorProducts;
            }
          }
        } else {
          // No search, show all vendors with products
          filtered[vendorId] = vendorProducts;
        }
      }
    });
    return filtered;
  }, [productsByVendor, filteredVendors, searchQuery, activeTab, vendorMapFromProducts]);

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
  });

  const cartItemCount = cartData?.itemCount || 0;

  // Fetch unread notification count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: getUnreadCount,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Fetch categories from API
  const { data: categories = [] } = useQuery({
    queryKey: ['productCategories'],
    queryFn: getCategories,
  });

  // Fetch ML recommendations for "All Products" tab
  const { user } = useAuth();
  const { data: mlRecommendations, isLoading: isLoadingML, error: mlError } = useQuery({
    queryKey: ['mlRecommendations', user?.id],
    queryFn: () => getMLRecommendations('hybrid', 6),
    enabled: activeTab === 'all' && !!user?.id,
    refetchInterval: 300000, // Refresh every 5 minutes
    retry: 1, // Only retry once
  });

  // Map ML recommendations to products
  const recommendedProducts = useMemo(() => {
    if (!mlRecommendations?.recommendations || !products) {
      return [];
    }

    const recProductIds = new Set(
      mlRecommendations.recommendations.map((rec: MLRecommendation) => rec.productId)
    );

    return products.filter((p) => recProductIds.has(p.id));
  }, [mlRecommendations, products]);



  const sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Name: A to Z', value: 'name_asc' },
    { label: 'Name: Z to A', value: 'name_desc' },
  ];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (minPrice) count++;
    if (maxPrice) count++;
    if (inStockOnly) count++;
    return count;
  }, [minPrice, maxPrice, inStockOnly]);

  function handleResetFilters() {
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setShowFilterModal(false);
  }

  function renderProductGrid({ item }: { item: Product }) {
    const priceVnd = Math.round(item.price);

    return (
      <TouchableOpacity
        style={styles.productCardGrid}
        onPress={() => (navigation as any).navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#64748B" />
            </View>
          )}
          {item.stock_quantity === 0 && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfoGrid}>
          <Text style={styles.productNameGrid} numberOfLines={2}>
            {item.name}
          </Text>
          {item.averageRating !== undefined && item.averageRating > 0 && (
            <View style={styles.ratingContainerGrid}>
              <StarRating
                rating={item.averageRating}
                readonly
                size={12}
                showRating
              />
              {item.totalRatings !== undefined && item.totalRatings > 0 && (
                <Text style={styles.ratingCountGrid}>({item.totalRatings})</Text>
              )}
            </View>
          )}

          <View style={styles.priceContainerGrid}>
            <Text style={styles.priceVndGrid}>{priceVnd.toLocaleString('en-US')} VND</Text>
          </View>

          {item.stock_quantity > 0 && (
            <View style={styles.stockBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text style={styles.stockBadgeText}>In Stock</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderVendor({ item }: { item: Vendor }) {
    return (
      <TouchableOpacity
        style={styles.vendorCard}
        onPress={() => (navigation as any).navigate('VendorShop', { vendorId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.vendorIconContainer}>
          <Ionicons name="storefront" size={40} color="#6366F1" />
        </View>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>{item.full_name || item.email}</Text>
          <Text style={styles.vendorEmail}>{item.email}</Text>
          <Text style={styles.vendorProductCount}>
            {item.productCount || 0} products
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </TouchableOpacity>
    );
  }

  function renderProductList({ item }: { item: Product }) {
    const priceVnd = Math.round(item.price);

    return (
      <TouchableOpacity
        style={styles.productCardList}
        onPress={() => (navigation as any).navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainerList}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImageList} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholderList}>
              <Ionicons name="image-outline" size={40} color="#64748B" />
            </View>
          )}
        </View>
        <View style={styles.productInfoList}>
          <Text style={styles.productNameList} numberOfLines={2}>
            {item.name}
          </Text>
          {item.averageRating !== undefined && item.averageRating > 0 && (
            <View style={styles.ratingContainerList}>
              <StarRating
                rating={item.averageRating}
                readonly
                size={14}
                showRating
              />
              {item.totalRatings !== undefined && item.totalRatings > 0 && (
                <Text style={styles.ratingCountList}>({item.totalRatings})</Text>
              )}
            </View>
          )}
          {item.description && (
            <Text style={styles.productDescriptionList} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.productFooterList}>
            <View style={styles.priceContainerList}>
              <Text style={styles.priceVndList}>{priceVnd.toLocaleString('en-US')} VND</Text>
            </View>
            {item.stock_quantity > 0 ? (
              <View style={styles.stockBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <Text style={styles.stockBadgeText}>In Stock</Text>
              </View>
            ) : (
              <Text style={styles.outOfStockTextList}>Out of Stock</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Search */}
        <LinearGradient colors={['#0F172A', '#020617']} style={styles.header}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'vendors' && styles.tabActive]}
            onPress={() => setActiveTab('vendors')}
          >
            <Text style={[styles.tabText, activeTab === 'vendors' && styles.tabTextActive]}>
              By Vendor
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Vendors - Only show for By Vendor tab */}
        {activeTab === 'vendors' && (
          <View style={styles.searchVendorContainer}>
            <Ionicons name="search" size={20} color="#64748B" style={styles.searchVendorIcon} />
            <TextInput
              style={styles.searchVendorInput}
              placeholder="Search vendors..."
              placeholderTextColor="#475569"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.searchVendorClear}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action Bar - Only show for All Products tab */}
        {activeTab === 'all' && (
          <View style={styles.actionBar}>
            <View style={styles.actionBarLeft}>
              <TouchableOpacity
                style={[styles.actionButton, activeFiltersCount > 0 && styles.actionButtonActive]}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons name="filter" size={18} color={activeFiltersCount > 0 ? '#fff' : '#64748B'} />
                <Text style={[styles.actionButtonText, activeFiltersCount > 0 && styles.actionButtonTextActive]}>
                  Filter
                  {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowSortModal(true)}
              >
                <Ionicons name="swap-vertical" size={18} color="#64748B" />
                <Text style={styles.actionButtonText}>Sort</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionBarRight}>
              <TouchableOpacity
                style={styles.viewModeButton}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Ionicons
                  name={viewMode === 'grid' ? 'grid' : 'list'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => (navigation as any).navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={20} color="#64748B" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cartButton}
                onPress={() => (navigation as any).navigate('ShoppingCart')}
              >
                <Ionicons name="cart-outline" size={20} color="#64748B" />
                {cartItemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Products List/Grid */}
        {activeTab === 'vendors' ? (
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : (
            <ScrollView
              refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
            >
              {Object.keys(filteredProductsByVendor).length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="storefront-outline" size={64} color="#64748B" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No vendors found' : 'No products found'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'No vendors have products yet'}
                  </Text>
                </View>
              ) : (
                Object.entries(filteredProductsByVendor).map(([vendorId, vendorProducts]) => {
                  // Try to find vendor from filteredVendors first, then from vendorMapFromProducts
                  const vendor = (filteredVendors || []).find((v) => v.id === vendorId) || vendorMapFromProducts.get(vendorId);
                  // Get total product count for this vendor (not just the 4 displayed)
                  const totalProductCount = (products || []).filter((p) => p.created_by === vendorId).length || 0;

                  // Skip if no products to display
                  if (!vendorProducts || vendorProducts.length === 0) return null;

                  return (
                    <View key={vendorId} style={styles.vendorSection}>
                      <TouchableOpacity
                        style={styles.vendorSectionHeader}
                        onPress={() => (navigation as any).navigate('VendorShop', { vendorId })}
                      >
                        <View style={styles.vendorSectionHeaderLeft}>
                          <View style={styles.vendorSectionIcon}>
                            <Ionicons name="storefront" size={24} color="#6366F1" />
                          </View>
                          <View>
                            <Text style={styles.vendorSectionName}>
                              {vendor?.full_name || vendor?.email || 'Loading...'}
                            </Text>
                            <Text style={styles.vendorSectionProductCount}>
                              {totalProductCount} {totalProductCount === 1 ? 'product' : 'products'}
                              {vendorProducts.length < totalProductCount && ` (showing top ${vendorProducts.length})`}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#64748B" />
                      </TouchableOpacity>
                      <View style={[styles.vendorProductsContainer, viewMode === 'grid' && styles.vendorProductsGrid]}>
                        {vendorProducts.map((product) => (
                          <View key={product.id} style={viewMode === 'grid' ? styles.vendorProductGridItem : undefined}>
                            {viewMode === 'grid' ? (
                              renderProductGrid({ item: product })
                            ) : (
                              renderProductList({ item: product })
                            )}
                          </View>
                        ))}
                      </View>
                      {totalProductCount > 4 && (
                        <TouchableOpacity
                          style={styles.viewAllButton}
                          onPress={() => (navigation as any).navigate('VendorShop', { vendorId })}
                        >
                          <Text style={styles.viewAllButtonText}>
                            View All {totalProductCount} Products
                          </Text>
                          <Ionicons name="arrow-forward" size={16} color="#6366F1" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )
        ) : (
          isLoading && !products ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={viewMode === 'grid' ? renderProductGrid : renderProductList}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode} // Force re-render when view mode changes
              contentContainerStyle={[
                styles.listContent,
                viewMode === 'grid' && styles.listContentGrid,
              ]}
              refreshControl={<RefreshControl refreshing={isLoading || false} onRefresh={refetch} />}
              ListHeaderComponent={
                <>
                  {/* Category Chips */}
                  <View style={styles.categoryContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryContent}
                      nestedScrollEnabled={true}
                    >
                      <TouchableOpacity
                        style={[
                          styles.categoryChip,
                          !selectedCategory ? styles.categoryChipActive : null,
                        ]}
                        onPress={() => setSelectedCategory(undefined)}
                      >
                        <Text
                          style={
                            !selectedCategory
                              ? [styles.categoryChipText, styles.categoryChipTextActive]
                              : styles.categoryChipText
                          }
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          All
                        </Text>
                      </TouchableOpacity>
                      {categories.map((category) => {
                        const isActive = selectedCategory === category;
                        return (
                          <TouchableOpacity
                            key={category}
                            style={[
                              styles.categoryChip,
                              isActive ? styles.categoryChipActive : null,
                            ]}
                            onPress={() => setSelectedCategory(category)}
                          >
                            <Text
                              style={
                                isActive
                                  ? [styles.categoryChipText, styles.categoryChipTextActive]
                                  : styles.categoryChipText
                              }
                              numberOfLines={1}
                            >
                              {category}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* ML Recommendations Section */}
                  {(recommendedProducts.length > 0 || isLoadingML) && (
                    <View style={styles.recommendationsSection}>
                      <View style={styles.recommendationsHeader}>
                        <Ionicons name="sparkles" size={20} color="#FF9500" />
                        <Text style={styles.recommendationsTitle}>Recommended for You</Text>
                        {mlRecommendations?.model && (
                          <View style={styles.modelBadge}>
                            <Text style={styles.modelBadgeText}>{mlRecommendations.model}</Text>
                          </View>
                        )}
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recommendationsContent}
                        nestedScrollEnabled={true}
                      >
                        {isLoadingML ? (
                          <View style={styles.recommendationsLoading}>
                            <ActivityIndicator size="small" color="#6366F1" />
                            <Text style={styles.recommendationsLoadingText}>Loading recommendations...</Text>
                          </View>
                        ) : recommendedProducts.length === 0 ? (
                          <View style={styles.recommendationsEmpty}>
                            <Text style={styles.recommendationsEmptyText}>
                              {mlError ? 'Unable to load recommendations' : 'No recommendations available'}
                            </Text>
                          </View>
                        ) : (
                          recommendedProducts.map((product) => {
                            const rec = mlRecommendations?.recommendations?.find(
                              (r: MLRecommendation) => r.productId === product.id
                            );
                            return (
                              <TouchableOpacity
                                key={product.id}
                                style={styles.recommendedProductCard}
                                onPress={() => (navigation as any).navigate('ProductDetail', { productId: product.id })}
                              >
                                {product.image_url ? (
                                  <Image source={{ uri: product.image_url }} style={styles.recommendedProductImage} />
                                ) : (
                                  <View style={styles.recommendedProductImagePlaceholder}>
                                    <Ionicons name="image-outline" size={30} color="#64748B" />
                                  </View>
                                )}
                                <View style={styles.recommendedProductInfo}>
                                  <Text style={styles.recommendedProductPrice}>{product.price.toLocaleString('en-US')} VND</Text>
                                  {rec && (
                                    <View style={styles.recommendedProductScore}>
                                      <Ionicons name="star" size={12} color="#FF9500" />
                                      <Text style={styles.recommendedProductScoreText}>
                                        {(rec.score * 100).toFixed(0)}% match
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  )}
                </>
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color="#64748B" />
                  <Text style={styles.emptyText}>No products found</Text>
                  <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                </View>
              }
            />
          )
        )}

        {/* Filter Modal */}
        <Modal
          visible={showFilterModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Products</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Price Range */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Price Range</Text>
                  <View style={styles.priceInputContainer}>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Min</Text>
                      <TextInput
                        style={styles.priceInputField}
                        placeholder="0"
                        placeholderTextColor="#475569"
                        value={minPrice}
                        onChangeText={setMinPrice}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={styles.priceSeparator}>-</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Max</Text>
                      <TextInput
                        style={styles.priceInputField}
                        placeholder="No limit"
                        placeholderTextColor="#475569"
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                {/* Stock Status */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Stock Status</Text>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setInStockOnly(!inStockOnly)}
                  >
                    <View style={[styles.checkbox, inStockOnly && styles.checkboxChecked]}>
                      {inStockOnly && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>In Stock Only</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={handleResetFilters}
                >
                  <Text style={styles.modalButtonTextSecondary}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.modalButtonTextPrimary}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Sort Modal */}
        <Modal
          visible={showSortModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSortModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sort By</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <Ionicons name="close" size={24} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      sortBy === option.value && styles.sortOptionActive,
                    ]}
                    onPress={() => {
                      setSortBy(option.value);
                      setShowSortModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === option.value && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {sortBy === option.value && (
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    backgroundColor: '#020617',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#F8FAFC',
    paddingVertical: 10,
  },
  clearButton: {
    marginLeft: 8,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020617',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  actionBarLeft: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  actionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewModeButton: {
    padding: 6,
  },
  notificationButton: {
    padding: 6,
    position: 'relative',
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
    borderWidth: 2,
    borderColor: '#020617',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cartButton: {
    padding: 6,
    position: 'relative',
  },
  cartBadge: {
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
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryContainer: {
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 12,
  },
  categoryContent: {
    paddingLeft: 15,
    paddingRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
    flexShrink: 0,
    minWidth: 60,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  listContent: {
    padding: 15,
  },
  listContentGrid: {
    paddingHorizontal: 10,
  },
  // Grid View Styles
  productCardGrid: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    margin: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  productImageContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfoGrid: {
    padding: 12,
  },
  productNameGrid: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
    minHeight: 36,
  },
  ratingContainerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  ratingCountGrid: {
    fontSize: 11,
    color: '#94A3B8',
  },
  priceContainerGrid: {
    marginTop: 4,
  },
  priceVndGrid: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  priceCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  priceCoinGrid: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  discountBadgeTextGrid: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  // List View Styles
  productCardList: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  productImageContainerList: {
    width: 120,
    height: 120,
  },
  productImageList: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholderList: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfoList: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productNameList: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  ratingContainerList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  ratingCountList: {
    fontSize: 12,
    color: '#94A3B8',
  },
  productDescriptionList: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  productFooterList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPriceList: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  priceContainerList: {
    marginTop: 0,
  },
  priceVndList: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  priceCoinList: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  discountBadgeTextList: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockTextList: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  outOfStockText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  // Vendor Card Styles
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  vendorIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  vendorEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  vendorProductCount: {
    fontSize: 12,
    color: '#64748B',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#6366F1',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  priceInputField: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#F8FAFC',
  },
  priceSeparator: {
    fontSize: 18,
    color: '#94A3B8',
    marginTop: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#E2E8F0',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sortOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#E2E8F0',
  },
  sortOptionTextActive: {
    color: '#818CF8',
    fontWeight: '600',
  },
  // Vendor Section Styles
  vendorSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  vendorSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  vendorSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vendorSectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vendorSectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  vendorSectionProductCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  vendorProductsContainer: {
    padding: 8,
  },
  vendorProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  vendorProductGridItem: {
    width: '50%',
    padding: 4,
  },
  searchVendorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchVendorIcon: {
    marginRight: 8,
  },
  searchVendorInput: {
    flex: 1,
    fontSize: 16,
    color: '#F8FAFC',
    paddingVertical: 0,
  },
  searchVendorClear: {
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#818CF8',
    marginRight: 4,
  },
  // ML Recommendations Styles
  recommendationsSection: {
    backgroundColor: '#020617',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  modelBadge: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modelBadgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  recommendationsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recommendedProductCard: {
    width: 160,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  recommendedProductImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#1E293B',
  },
  recommendedProductImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedProductInfo: {
    padding: 12,
  },
  recommendedProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
    minHeight: 36,
  },
  recommendedProductPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  recommendedProductScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  recommendedProductScoreText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },
  recommendationsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  recommendationsLoadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  recommendationsEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  recommendationsEmptyText: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
});
