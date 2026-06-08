import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { register } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { login: setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  /**
   * Handle registration form submission
   */
  async function handleRegister() {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Starting registration...');
      const response = await register(email, password, fullName || undefined);
      console.log('✅ Registration successful, setting user...');
      setUser(response.user);
      Alert.alert('Success', 'Account registered successfully!');
    } catch (error: any) {
      console.error('❌ Registration error in screen:', error);
      const errorMessage = error.response?.data?.error
        || error.message
        || 'Registration failed. Please check your internet connection and try again.';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0F172A', '#020617']} style={styles.gradientBg}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.logoSection}>
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.logoBadge}
                  >
                    <Ionicons name="person-add" size={32} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.title}>Register</Text>
                  <Text style={styles.subtitle}>Create an account</Text>
                </View>

                {/* Form Card */}
                <View style={styles.formCard}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name (Optional)</Text>
                    <View style={[
                      styles.inputContainer,
                      isNameFocused && styles.inputContainerFocused
                    ]}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color={isNameFocused ? '#6366F1' : '#64748B'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter full name..."
                        placeholderTextColor="#475569"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                        returnKeyType="next"
                        onFocus={() => setIsNameFocused(true)}
                        onBlur={() => setIsNameFocused(false)}
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <View style={[
                      styles.inputContainer,
                      isEmailFocused && styles.inputContainerFocused
                    ]}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={isEmailFocused ? '#6366F1' : '#64748B'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter email address..."
                        placeholderTextColor="#475569"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        returnKeyType="next"
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={[
                      styles.inputContainer,
                      isPasswordFocused && styles.inputContainerFocused
                    ]}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={isPasswordFocused ? '#6366F1' : '#64748B'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter password (minimum 6 characters)..."
                        placeholderTextColor="#475569"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        returnKeyType="done"
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        onSubmitEditing={handleRegister}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.buttonContainer}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#6366F1', '#4F46E5']}
                      style={[styles.button, loading && styles.buttonDisabled]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Register Now</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.linkText}>
                      Already have an account? <Text style={styles.linkTextBold}>Login</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
  },
  inputContainerFocused: {
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    paddingVertical: 14,
    fontSize: 15,
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#818CF8',
    fontWeight: '700',
  },
});


