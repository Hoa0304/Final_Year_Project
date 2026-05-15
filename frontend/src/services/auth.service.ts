import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  balance: number;
  avatarUrl?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

/**
 * Register a new user
 */
export async function register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
  console.log('📝 Attempting to register user:', email);
  try {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      fullName,
    });

    console.log('✅ Registration successful:', response.data.user.email);

    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error: any) {
    console.error('❌ Registration failed:', error.message);
    if (error.response) {
      console.error('   Response data:', error.response.data);
      console.error('   Status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });

  if (response.data.token) {
    await AsyncStorage.setItem('authToken', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('user');
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get stored auth token
 */
export async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('authToken');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

