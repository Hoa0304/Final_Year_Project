import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getBalance, getProfile, updateProfile } from '../../services/user.service';
import { useAuth } from '../../context/AuthContext';
import ImageUploadPicker from '../../components/ImageUploadPicker';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: getBalance,
  });

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedProfile) => {
      // Update auth context with new profile data
      updateUser({
        ...user!,
        fullName: updatedProfile.fullName,
        avatarUrl: updatedProfile.avatarUrl,
      });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    },
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDate, setBirthDate] = useState<Date>(() => {
    if (profile?.dateOfBirth) {
      return new Date(profile.dateOfBirth);
    }
    return new Date(2000, 0, 1); // Default to Jan 1, 2000
  });

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    bio: '',
    address: '',
    dateOfBirth: '',
    avatarUrl: '',
  });

  // Initialize form data when profile loads or editing starts
  React.useEffect(() => {
    if (profile) {
      const dob = profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date(2000, 0, 1);
      setBirthDate(dob);
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        address: profile.address || '',
        dateOfBirth: profile.dateOfBirth || '',
        avatarUrl: profile.avatarUrl || '',
      });
    }
  }, [profile, isEditing]);

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  function handleSave() {
    updateProfileMutation.mutate(formData);
  }

  function handleCancel() {
    setIsEditing(false);
    // Reset form data
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        address: profile.address || '',
        dateOfBirth: profile.dateOfBirth || '',
        avatarUrl: profile.avatarUrl || '',
      });
    }
  }

  const displayProfile = profile || user;
  const displayAvatar = displayProfile?.avatarUrl || (user as any)?.avatarUrl;
  const displayName = displayProfile?.fullName || user?.fullName || 'User';

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color="#818CF8" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={updateProfileMutation.isPending}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.avatarContainer}>
            {isEditing ? (
              <ImageUploadPicker
                value={formData.avatarUrl}
                onChange={(url) => setFormData({ ...formData, avatarUrl: url })}
                folder="users"
                style={styles.avatarUploader}
              />
            ) : (
              <>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    {user?.role === 'vendor' ? (
                      <Ionicons name="storefront-outline" size={50} color="#F59E0B" />
                    ) : (
                      <Ionicons name="person-outline" size={50} color="#6366F1" />
                    )}
                  </View>
                )}
              </>
            )}
          </View>

          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              placeholder="Full Name"
              placeholderTextColor="#475569"
            />
          ) : (
            <Text style={styles.name}>{displayName}</Text>
          )}

          <Text style={styles.email}>{user?.email}</Text>

          {user?.role && (
            <View style={[styles.roleBadge, user.role === 'vendor' && styles.vendorBadge]}>
              <Text style={[styles.roleText, user.role === 'vendor' && styles.vendorRoleText]}>
                {user.role === 'vendor' ? 'VENDOR' : user.role.toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Shopee Coins Balance</Text>
            <Text style={styles.balanceAmount}>{Math.round(balance || 0).toLocaleString('en-US')} coins</Text>
            {!isEditing && (
              <TouchableOpacity
                style={styles.topUpButton}
                onPress={() => (navigation as any).navigate('TopUp')}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.topUpButtonGradient}
                >
                  <Ionicons name="wallet-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.topUpButtonText}>Top Up Coins</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter phone number"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.phone || 'Not set'}</Text>
            )}
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {birthDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#818CF8" />
                </TouchableOpacity>
                {showDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={birthDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setBirthDate(selectedDate);
                          // Format as YYYY-MM-DD
                          const formattedDate = selectedDate.toISOString().split('T')[0];
                          setFormData({ ...formData, dateOfBirth: formattedDate });
                        }
                      }}
                      maximumDate={new Date()}
                      textColor="#ffffff"
                      themeVariant="dark"
                      style={Platform.OS === 'ios' ? styles.datePickerIOS : undefined}
                    />
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                  : 'Not set'}
              </Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Address</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Enter your address"
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.address || 'Not set'}</Text>
            )}
          </View>

          {/* Bio */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Bio</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                value={formData.bio}
                onChangeText={(text) => setFormData({ ...formData, bio: text })}
                placeholder="Introduce yourself..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.bio || 'No bio yet'}</Text>
            )}
          </View>
        </View>

        {/* Menu Items */}
        {!isEditing && (
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => (navigation as any).navigate('Transactions')}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="receipt-outline" size={20} color="#818CF8" />
              </View>
              <Text style={styles.menuText}>Transaction History</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => (navigation as any).navigate('PurchaseHistory')}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="bag-outline" size={20} color="#818CF8" />
              </View>
              <Text style={styles.menuText}>Purchase History</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => (navigation as any).navigate('ShoppingCart')}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="cart-outline" size={20} color="#818CF8" />
              </View>
              <Text style={styles.menuText}>My Cart</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => (navigation as any).navigate('Notifications')}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.menuText}>System Notifications</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => (navigation as any).navigate('NotificationPreferences')}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                <Ionicons name="settings-outline" size={20} color="#94A3B8" />
              </View>
              <Text style={styles.menuText}>Notification Settings</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#94A3B8" />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        {!isEditing && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
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
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
  },
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  editButtonText: {
    marginLeft: 6,
    color: '#818CF8',
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarUploader: {
    width: '100%',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#6366F1',
    paddingVertical: 4,
    width: '100%',
  },
  email: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  vendorBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#818CF8',
  },
  vendorRoleText: {
    color: '#F59E0B',
  },
  balanceContainer: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F59E0B',
  },
  topUpButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 14,
  },
  topUpButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topUpButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 15,
    color: '#E2E8F0',
    paddingVertical: 8,
  },
  fieldInput: {
    fontSize: 15,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
  },
  datePickerText: {
    fontSize: 15,
    color: '#F8FAFC',
  },
  datePickerContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  datePickerIOS: {
    backgroundColor: '#0F172A',
    width: '100%',
    height: 200,
  },
  menuSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

