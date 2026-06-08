import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrderById,
  updateOrderStatus,
  Order,
  OrderStatus,
  getStatusLabel,
  getStatusColor,
  getStatusProgress,
  getNextStatuses,
  mockVndPayment,
} from '../../services/order.service';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const TIMELINE_STEPS: OrderStatus[] = ['processing', 'shipped', 'out_for_delivery', 'delivered'];

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { orderId } = route.params || {};

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [vendorNotes, setVendorNotes] = useState('');
  const [trackingCode, setTrackingCode] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const order = data as Order | undefined;
  const isVendor = user?.role === 'vendor';
  const isAdmin = user?.role === 'admin';

  const updateStatusMutation = useMutation({
    mutationFn: () =>
      updateOrderStatus(orderId, selectedStatus!, vendorNotes, trackingCode),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['vendorOrders'] });
      setStatusModalVisible(false);
      setVendorNotes('');
      setTrackingCode('');

      if (result.lateCompensation?.issued) {
        Alert.alert(
          '✅ Delivered',
          'The order has been delivered. Due to delayed delivery, a compensation voucher has been sent to the customer automatically.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', `Status updated: ${getStatusLabel(selectedStatus!)}`);
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.error || 'Could not update status');
    },
  });

  const mockPayMutation = useMutation({
    mutationFn: () => mockVndPayment(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      Alert.alert('✅ Payment Successful (Mock)', 'The order payment has been confirmed');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.error || 'Mock payment error');
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = getStatusProgress(order.status);
  const statusColor = getStatusColor(order.status);
  const nextStatuses = getNextStatuses(order.status);
  const estimatedDate = order.estimated_delivery ? new Date(order.estimated_delivery) : null;
  const isLate = order.isLate;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Late Warning Banner */}
        {isLate && (
          <View style={styles.lateBanner}>
            <Ionicons name="warning" size={20} color="#FF9500" />
            <View style={styles.lateBannerContent}>
              <Text style={styles.lateBannerTitle}>Order is delayed</Text>
              <Text style={styles.lateBannerSub}>
                {order.late_compensation_voucher_id
                  ? '✅ Compensation voucher has been issued to you'
                  : 'You will receive a compensation voucher when the order is delivered'
                }
              </Text>
            </View>
          </View>
        )}

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(order.status)}
            </Text>
          </View>

          {/* Progress Bar */}
          {order.status !== 'cancelled' && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}

          {/* Timeline */}
          {order.status !== 'cancelled' && (
            <View style={styles.timeline}>
              {TIMELINE_STEPS.map((step, idx) => {
                const stepProgress = getStatusProgress(step);
                const isDone = progress >= stepProgress;
                const isCurrent = order.status === step;
                return (
                  <View key={step} style={styles.timelineStep}>
                    <View style={styles.timelineIcon}>
                      <View style={[
                        styles.timelineDot,
                        isDone ? { backgroundColor: statusColor } : { backgroundColor: '#2A2A3E' },
                        isCurrent && styles.timelineDotCurrent
                      ]}>
                        {isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      {idx < TIMELINE_STEPS.length - 1 && (
                        <View style={[styles.timelineLine, isDone && { backgroundColor: statusColor }]} />
                      )}
                    </View>
                    <Text style={[styles.timelineLabel, isCurrent && { color: statusColor }]}>
                      {getStatusLabel(step)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {order.status === 'cancelled' && (
            <View style={styles.cancelledBadge}>
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
              <Text style={styles.cancelledText}>Order was cancelled</Text>
            </View>
          )}
        </View>

        {/* Delivery Date */}
        {estimatedDate && order.status !== 'cancelled' && order.status !== 'delivered' && (
          <View style={[styles.infoCard, isLate && styles.infoCardLate]}>
            <Ionicons name="calendar-outline" size={20} color={isLate ? '#FF9500' : '#7C3AED'} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {isLate ? '⚠️ Estimated delivery (Delayed)' : 'Estimated delivery'}
              </Text>
              <Text style={[styles.infoValue, isLate && { color: '#FF9500' }]}>
                {estimatedDate.toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </Text>
            </View>
          </View>
        )}

        {order.status === 'delivered' && order.delivered_at && (
          <View style={styles.infoCard}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Delivered at</Text>
              <Text style={[styles.infoValue, { color: '#34C759' }]}>
                {new Date(order.delivered_at).toLocaleString('en-US')}
              </Text>
            </View>
          </View>
        )}

        {/* Tracking Code */}
        {order.tracking_code && (
          <View style={styles.infoCard}>
            <Ionicons name="barcode-outline" size={20} color="#06B6D4" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tracking code</Text>
              <Text style={[styles.infoValue, { color: '#06B6D4' }]}>{order.tracking_code}</Text>
            </View>
          </View>
        )}

        {/* Product Info */}
        {order.products && (
          <View style={styles.productCard}>
            <Text style={styles.sectionTitle}>Products</Text>
            <View style={styles.productRow}>
              {order.products.image_url ? (
                <Image source={{ uri: order.products.image_url }} style={styles.productImg} resizeMode="cover" />
              ) : (
                <View style={styles.productImgPlaceholder}>
                  <Ionicons name="cube-outline" size={28} color="#7C3AED" />
                </View>
              )}
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{order.products.name}</Text>
                {order.products.category && (
                  <Text style={styles.productCategory}>{order.products.category}</Text>
                )}
                <Text style={styles.quantityText}>Quantity: {order.quantity}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentRow}>
            <Ionicons
              name="card"
              size={20}
              color="#06B6D4"
            />
            <Text style={styles.paymentMethod}>Payment Method: VND</Text>
          </View>

          <View style={{ marginTop: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#888', fontSize: 13 }}>Original Price</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                {Math.round(order.original_price_coins).toLocaleString('en-US')} VND
              </Text>
            </View>
            {order.price_coins > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#888', fontSize: 13 }}>Coins Discount</Text>
                <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600' }}>
                  -{Math.round(order.price_coins).toLocaleString('en-US')} coins (-{Math.round(order.price_coins).toLocaleString('en-US')} VND)
                </Text>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: '#2A2A3E', marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Total Payment</Text>
              <Text style={{ color: '#7C3AED', fontSize: 16, fontWeight: '800' }}>
                {Math.round(order.price_vnd).toLocaleString('en-US')} VND
              </Text>
            </View>
          </View>

          {order.price_coins > 0 && (
            <Text style={styles.discountHint}>
              You saved {Math.round(order.price_coins).toLocaleString('en-US')} VND by paying with coins
            </Text>
          )}

          {/* Dev: Mock VND Payment Button */}
          {__DEV__ && order.payment_method === 'vnd' && order.status === 'pending_payment' && (
            <TouchableOpacity
              style={styles.mockPayBtn}
              onPress={() => {
                Alert.alert(
                  '⚡ Dev Mode',
                  'Confirm mock VND payment?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Confirm', onPress: () => mockPayMutation.mutate() }
                  ]
                );
              }}
              disabled={mockPayMutation.isPending}
            >
              {mockPayMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={16} color="#fff" />
                  <Text style={styles.mockPayText}>Mock VND Payment (Dev)</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Vendor Notes */}
        {order.vendor_notes && (
          <View style={styles.notesCard}>
            <Ionicons name="chatbubble-outline" size={16} color="#888" />
            <Text style={styles.notesText}>{order.vendor_notes}</Text>
          </View>
        )}

        {/* Vendor Actions */}
        {(isVendor || isAdmin) && order.vendor_id === user?.id || isAdmin ? (
          nextStatuses.length > 0 && (
            <View style={styles.vendorActionsCard}>
              <Text style={styles.sectionTitle}>Update Status</Text>
              <View style={styles.nextStatusBtns}>
                {nextStatuses.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.nextStatusBtn, { borderColor: getStatusColor(s) }]}
                    onPress={() => {
                      setSelectedStatus(s);
                      setStatusModalVisible(true);
                    }}
                  >
                    <Text style={[styles.nextStatusText, { color: getStatusColor(s) }]}>
                      {getStatusLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update: {selectedStatus ? getStatusLabel(selectedStatus) : ''}
              </Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Tracking Code (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. tracking-12345"
              placeholderTextColor="#555"
              value={trackingCode}
              onChangeText={setTrackingCode}
            />

            <Text style={styles.modalLabel}>Notes for Customer (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Add note..."
              placeholderTextColor="#555"
              value={vendorNotes}
              onChangeText={setVendorNotes}
              multiline
              numberOfLines={3}
            />

            {selectedStatus === 'delivered' && (
              <View style={styles.lateWarning}>
                <Ionicons name="information-circle-outline" size={16} color="#FF9500" />
                <Text style={styles.lateWarningText}>
                  If this order is delivered late, a compensation voucher will be automatically issued to the customer
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, updateStatusMutation.isPending && styles.confirmBtnDisabled]}
              onPress={() => updateStatusMutation.mutate()}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0D1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { flex: 1 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  loadingText: { color: '#888', fontSize: 16 },
  errorText: { color: '#FF3B30', fontSize: 16, marginTop: 12 },
  lateBanner: {
    margin: 16,
    backgroundColor: '#FF950020',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  lateBannerContent: { flex: 1 },
  lateBannerTitle: { fontSize: 14, fontWeight: '700', color: '#FF9500', marginBottom: 4 },
  lateBannerSub: { fontSize: 12, color: '#888' },
  statusCard: {
    margin: 16,
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  statusHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 18, fontWeight: '800' },
  progressBarContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
  },
  progressBarBg: {
    flex: 1, height: 8, backgroundColor: '#2A2A3E', borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#888', width: 35, textAlign: 'right' },
  timeline: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineStep: { alignItems: 'center', flex: 1 },
  timelineIcon: { alignItems: 'center', flexDirection: 'row', width: '100%', marginBottom: 6 },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  timelineDotCurrent: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff',
  },
  timelineLine: {
    flex: 1, height: 2, backgroundColor: '#2A2A3E', marginLeft: -2,
  },
  timelineLabel: { fontSize: 10, color: '#666', textAlign: 'center', lineHeight: 14 },
  cancelledBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', paddingTop: 16,
  },
  cancelledText: { fontSize: 16, fontWeight: '700', color: '#FF3B30' },
  infoCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1E1E2E', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  infoCardLate: { borderColor: '#FF9500' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#fff' },
  productCard: {
    margin: 16,
    backgroundColor: '#1E1E2E', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  productRow: { flexDirection: 'row', gap: 12 },
  productImg: { width: 70, height: 70, borderRadius: 10 },
  productImgPlaceholder: {
    width: 70, height: 70, borderRadius: 10,
    backgroundColor: '#2A2A3E', justifyContent: 'center', alignItems: 'center',
  },
  productDetails: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  productCategory: { fontSize: 12, color: '#7C3AED', marginBottom: 6 },
  quantityText: { fontSize: 13, color: '#888' },
  paymentCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1E1E2E', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentMethod: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '600' },
  paymentAmount: { fontSize: 16, fontWeight: '800', color: '#fff' },
  discountHint: { fontSize: 12, color: '#34C759', marginTop: 8 },
  mockPayBtn: {
    marginTop: 12, backgroundColor: '#FF9500',
    borderRadius: 10, padding: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mockPayText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  notesCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1E1E2E', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 10,
    borderWidth: 1, borderColor: '#2A2A3E',
  },
  notesText: { fontSize: 13, color: '#888', flex: 1 },
  vendorActionsCard: {
    margin: 16,
    backgroundColor: '#1E1E2E', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#7C3AED50',
  },
  nextStatusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nextStatusBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5,
  },
  nextStatusText: { fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E2E',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#2A2A3E', borderRadius: 10,
    padding: 12, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: '#3A3A4E', marginBottom: 16,
  },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  lateWarning: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#FF950015',
    borderRadius: 10, padding: 12,
    marginBottom: 16, alignItems: 'flex-start',
  },
  lateWarningText: { fontSize: 12, color: '#FF9500', flex: 1, lineHeight: 18 },
  confirmBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
