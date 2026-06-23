import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';

interface AdminMenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  color: string;
  description: string;
}

export default function AdminMoreScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const menuItems: AdminMenuItem[] = [
    {
      id: 'orders',
      title: 'Quản lý đơn hàng',
      icon: 'receipt',
      screen: 'Orders',
      color: '#3B82F6',
      description: 'Theo dõi và xử lý tất cả đơn hàng',
    },
    {
      id: 'vendors',
      title: 'Phân tích Người bán',
      icon: 'stats-chart',
      screen: 'Vendors',
      color: '#10B981',
      description: 'Thống kê và doanh thu của các shop',
    },
    {
      id: 'profile',
      title: 'Hồ sơ',
      icon: 'person',
      screen: 'Profile',
      color: '#8B5CF6',
      description: 'Chi tiết tài khoản quản trị viên',
    },
  ];

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out of the admin account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => await logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1E1B4B', '#0F172A']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Hệ thống</Text>
          <Text style={styles.headerSubtitle}>Quản lý tính năng quản trị mở rộng</Text>
        </View>
      </LinearGradient>

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tính năng mở rộng</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  if (item.screen === 'Vendors') {
                    navigation.navigate(item.screen, { filter: 'vendors_only' });
                  } else {
                    navigation.navigate(item.screen);
                  }
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#1E293B', '#0F172A']}
                  style={styles.itemGradient}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={26} color={item.color} />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bảo mật & Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Bảng quản trị HMall • Phiên bản 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerContent: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  menuItem: {
    width: '50%',
    padding: 6,
  },
  itemGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 145,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  menuDescription: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  logoutSection: {
    marginTop: 36,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 16,
  },
});
