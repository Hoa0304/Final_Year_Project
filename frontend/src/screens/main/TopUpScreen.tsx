import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCoinPackages, createPayment, CoinPackage } from '../../services/payment.service';
import { LinearGradient } from 'expo-linear-gradient';

export default function TopUpScreen({ navigation }: any) {
  const [selectedMethod, setSelectedMethod] = useState<'vnpay' | 'momo'>('vnpay');

  const { data: packages, isLoading } = useQuery({
    queryKey: ['coinPackages'],
    queryFn: getCoinPackages,
  });

  const paymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: (data) => {
      if (data.url) {
        Linking.openURL(data.url);
      } else {
        Alert.alert('Error', 'Unable to create payment link');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Transaction failed');
    },
  });

  const handlePurchase = (pkg: CoinPackage) => {
    paymentMutation.mutate({
      amount: pkg.price_vnd,
      method: selectedMethod,
      packageId: pkg.id,
      referenceType: 'coin_package',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Up Coins</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'vnpay' && styles.methodCardSelected, { marginBottom: 12 }]}
            onPress={() => setSelectedMethod('vnpay')}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="card-outline" size={22} color="#6366F1" />
            </View>
            <Text style={styles.methodName}>VNPay (ATM Card / QR)</Text>
            {selectedMethod === 'vnpay' ? (
              <Ionicons name="checkmark-circle" size={22} color="#6366F1" />
            ) : (
              <View style={styles.unselectedCircle} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'momo' && styles.methodCardSelectedMomo]}
            onPress={() => setSelectedMethod('momo')}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
              <Ionicons name="wallet-outline" size={22} color="#EC4899" />
            </View>
            <Text style={styles.methodName}>MoMo Wallet</Text>
            {selectedMethod === 'momo' ? (
              <Ionicons name="checkmark-circle" size={22} color="#EC4899" />
            ) : (
              <View style={styles.unselectedCircle} />
            )}
          </TouchableOpacity>
        </View>

        {/* Packages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coin Packages</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
          ) : packages?.length === 0 ? (
            <Text style={styles.emptyText}>No coin packages available at this time.</Text>
          ) : (
            packages?.map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageInfo}>
                  <View style={styles.coinHeader}>
                    <Ionicons name="logo-bitcoin" size={24} color="#F59E0B" />
                    <Text style={styles.coinAmount}>{Math.round(pkg.coins).toLocaleString('en-US')} coins</Text>
                  </View>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  {pkg.description && (
                    <Text style={styles.packageDesc}>{pkg.description}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => handlePurchase(pkg)}
                  disabled={paymentMutation.isPending}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buyButtonGradient}
                  >
                    {paymentMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.buyButtonText}>
                        {Math.round(pkg.price_vnd).toLocaleString('en-US')} VND
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  methodCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  methodCardSelectedMomo: {
    borderColor: '#EC4899',
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  unselectedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#334155',
  },
  packageCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  packageInfo: {
    flex: 1,
    marginRight: 12,
  },
  coinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  coinAmount: {
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
    color: '#F59E0B',
  },
  packageName: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  packageDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
  },
  buyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
  },
});

