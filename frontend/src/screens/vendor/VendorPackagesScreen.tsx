import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../config/api';

interface VendorPackage {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  product_limit: number;
  category_limit: number;
  featured_days: number;
}

export default function VendorPackagesScreen() {
  const navigation = useNavigation<any>();

  const { data: packages, isLoading } = useQuery({
    queryKey: ['vendorPackages'],
    queryFn: async () => {
      const res = await api.get('/payments/vendor-packages');
      return res.data.packages as VendorPackage[];
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await api.post('/payments/create', {
        amount: 0, // Server calculates based on package
        method: 'coin', // Mock method or actual
        packageId,
        referenceType: 'vendor_package'
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'You have registered the package successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.error || 'Could not register package at this time');
    }
  });

  const getPackageColor = (index: number): [string, string] => {
    const colors: Array<[string, string]> = [
      ['#3B82F6', '#2563EB'], // Basic
      ['#8B5CF6', '#6D28D9'], // Pro
      ['#F59E0B', '#D97706'], // Premium
    ];
    return colors[Math.min(index, colors.length - 1)];
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0F172A', '#020617']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listing Packages</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Upgrade Your Store</Text>
          <Text style={styles.heroSub}>List more products, reach more customers</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.packageContainer}>
            {/* Free Tier Info */}
            <View style={styles.freeCard}>
              <View style={styles.freeHeader}>
                <Text style={styles.freeTitle}>Free Package (Current)</Text>
                <Text style={styles.freePrice}>0 VND</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>1 product / week</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Max 1 category</Text>
              </View>
            </View>

            {/* Paid Packages */}
            {packages?.map((pkg, idx) => (
              <LinearGradient
                key={pkg.id}
                colors={getPackageColor(idx)}
                style={styles.packageCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.pkgHeader}>
                  <Text style={styles.pkgName}>{pkg.name}</Text>
                  <View style={styles.pkgPriceBox}>
                    <Text style={styles.pkgPrice}>{pkg.price_monthly.toLocaleString('en-US')} VND</Text>
                    <Text style={styles.pkgPeriod}>/ month</Text>
                  </View>
                </View>

                <Text style={styles.pkgDesc}>{pkg.description}</Text>

                <View style={styles.pkgFeatures}>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featureTextLight}>
                      {pkg.product_limit === -1 ? 'Unlimited products listing' : `Max ${pkg.product_limit} products / week`}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featureTextLight}>
                      {pkg.category_limit === -1 ? 'Sell in all categories' : `Max ${pkg.category_limit} categories`}
                    </Text>
                  </View>
                  {pkg.featured_days > 0 && (
                    <View style={styles.featureRow}>
                      <Ionicons name="star" size={20} color="#FDE047" />
                      <Text style={[styles.featureTextLight, { color: '#FDE047', fontWeight: '600' }]}>
                        {pkg.featured_days} days featured priority
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.buyBtn}
                  onPress={() => purchaseMutation.mutate(pkg.id)}
                  disabled={purchaseMutation.isPending}
                >
                  {purchaseMutation.isPending ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.buyBtnText}>Subscribe now</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  scroll: { flex: 1 },
  heroSection: { padding: 24, alignItems: 'center', backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 8, textAlign: 'center' },
  heroSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  packageContainer: { padding: 16, gap: 16 },
  freeCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  freeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  freeTitle: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  freePrice: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  featureText: { fontSize: 14, color: '#CBD5E1', flex: 1 },
  packageCard: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  pkgName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  pkgPriceBox: { alignItems: 'flex-end' },
  pkgPrice: { fontSize: 20, fontWeight: '800', color: '#fff' },
  pkgPeriod: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  pkgDesc: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 20, lineHeight: 20 },
  pkgFeatures: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 16, marginBottom: 20 },
  featureTextLight: { fontSize: 14, color: '#fff', flex: 1 },
  buyBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buyBtnText: { color: '#020617', fontSize: 16, fontWeight: '700' },
});
