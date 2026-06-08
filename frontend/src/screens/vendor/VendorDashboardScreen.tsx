import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getVendorAnalytics } from '../../services/vendor.service';
import { LinearGradient } from 'expo-linear-gradient';

export default function VendorDashboardScreen() {
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState(30);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vendorAnalytics', period],
    queryFn: () => getVendorAnalytics(period),
  });

  const analytics = data?.analytics;
  const subscription = data?.subscription;

  if (isLoading && !analytics) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading analytics data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0F172A', '#020617']} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vendor Dashboard</Text>
          <Text style={styles.headerSub}>Overview of business activities</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#10B981" />}
      >
        {/* Subscription Banner */}
        <View style={styles.subscriptionBanner}>
          <LinearGradient colors={['#10B98120', '#04785720']} style={styles.subGradient}>
            <View style={styles.subHeader}>
              <View style={styles.subTitleRow}>
                <Ionicons name="ribbon" size={20} color="#10B981" />
                <Text style={styles.subTitle}>
                  Current Package: <Text style={styles.subPackageName}>{subscription?.packageName}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation.navigate('VendorPackages')}
              >
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.limitBarContainer}>
              <View style={styles.limitHeader}>
                <Text style={styles.limitLabel}>Products listed this week</Text>
                <Text style={styles.limitValue}>
                  {analytics?.productsThisWeek} / {analytics?.productLimit === -1 ? '∞' : analytics?.productLimit}
                </Text>
              </View>
              {analytics?.productLimit !== -1 && (
                <View style={styles.limitBarBg}>
                  <View
                    style={[
                      styles.limitBarFill,
                      {
                        width: `${Math.min(100, (analytics?.productsThisWeek! / analytics?.productLimit!) * 100)}%`,
                        backgroundColor: analytics?.productsThisWeek! >= analytics?.productLimit! ? '#EF4444' : '#10B981',
                      },
                    ]}
                  />
                </View>
              )}
              {analytics?.productsThisWeek! >= analytics?.productLimit! && analytics?.productLimit !== -1 && (
                <Text style={styles.limitWarning}>
                  You have reached your listing limit for this week. Please upgrade your package to list more.
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[7, 30, 90].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                Last {p} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardFull}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCardGradient}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="wallet" size={24} color="#10B981" />
                </View>
                <Text style={styles.statTitle}>Total revenue (VND)</Text>
              </View>
              <Text style={styles.statValueVnd}>
                {(analytics?.totalRevenueVnd || 0).toLocaleString('en-US')} VND
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCardGradient}>
              <View style={[styles.statIcon, { backgroundColor: '#F59E0B20', marginBottom: 8 }]}>
                <Ionicons name="logo-bitcoin" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statTitle}>Buyers use coins</Text>
              <Text style={styles.statValueCoins}>
                {(analytics?.totalRevenueCoins || 0).toLocaleString('en-US')} <Text style={styles.statCurrency}>coins</Text>
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCardGradient}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F620', marginBottom: 8 }]}>
                <Ionicons name="cart" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.statTitle}>Total Orders</Text>
              <Text style={styles.statValueNormal}>
                {analytics?.totalOrders || 0}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCardGradient}>
              <View style={[styles.statIcon, { backgroundColor: '#8B5CF620', marginBottom: 8 }]}>
                <Ionicons name="time" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.statTitle}>Pending Orders</Text>
              <Text style={styles.statValueNormal}>
                {analytics?.pendingOrders || 0}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.statCardHalf}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.statCardGradient}>
              <View style={[styles.statIcon, { backgroundColor: '#EC489920', marginBottom: 8 }]}>
                <Ionicons name="cube" size={20} color="#EC4899" />
              </View>
              <Text style={styles.statTitle}>Total Products</Text>
              <Text style={styles.statValueNormal}>
                {analytics?.totalProducts || 0}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('VendorOrders')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="list" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.actionText}>Order Management</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('VendorProducts')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EC489920' }]}>
                <Ionicons name="pricetags" size={24} color="#EC4899" />
              </View>
              <Text style={styles.actionText}>My Products</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#94A3B8', fontSize: 16 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#94A3B8' },
  scroll: { flex: 1 },
  subscriptionBanner: { margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#10B98140' },
  subGradient: { padding: 16 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subTitle: { fontSize: 14, color: '#D1D5DB' },
  subPackageName: { fontWeight: '700', color: '#10B981', fontSize: 16 },
  upgradeBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  upgradeBtnText: { color: '#020617', fontSize: 12, fontWeight: '700' },
  limitBarContainer: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12 },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  limitLabel: { fontSize: 13, color: '#94A3B8' },
  limitValue: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  limitBarBg: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  limitBarFill: { height: '100%', borderRadius: 3 },
  limitWarning: { fontSize: 12, color: '#EF4444', marginTop: 8 },
  periodSelector: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  periodBtnActive: { backgroundColor: '#10B98120', borderColor: '#10B981' },
  periodBtnText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  periodBtnTextActive: { color: '#10B981' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  statCardFull: { width: '100%', padding: 6 },
  statCardHalf: { width: '50%', padding: 6 },
  statCardGradient: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statTitle: { fontSize: 13, color: '#94A3B8', fontWeight: '500', marginBottom: 4 },
  statValueVnd: { fontSize: 28, fontWeight: '800', color: '#10B981' },
  statValueCoins: { fontSize: 20, fontWeight: '800', color: '#F59E0B' },
  statValueNormal: { fontSize: 24, fontWeight: '800', color: '#F8FAFC' },
  statCurrency: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  section: { padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginBottom: 16 },
  quickActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#1E293B', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#E2E8F0' },
});
