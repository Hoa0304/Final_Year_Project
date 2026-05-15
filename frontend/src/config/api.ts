import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get API URL from environment or use default
// For tunnel mode, you may need to use your computer's IP address
// Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:3002
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

// Log API configuration for debugging
console.log('🔧 API Configuration:');
console.log('   API_URL:', API_URL);
console.log('   EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL || 'not set');

/**
 * Create axios instance with default configuration
 */
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000, // Increased timeout for tunnel connections
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - add auth token to requests
 */
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData - let axios set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Log request for debugging
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle errors globally
 */
api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    // Log error details
    if (error.response) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`);
      console.error('   Error:', error.response.data);
    } else if (error.request) {
      console.error('❌ Network Error - No response received');
      console.error('   Request URL:', error.config?.url);
      console.error('   This usually means:');
      console.error('   1. Backend is not running');
      console.error('   2. Wrong API URL (check EXPO_PUBLIC_API_URL)');
      console.error('   3. CORS issue (check backend CORS_ORIGIN)');
      console.error('   4. Firewall blocking connection');
    } else {
      console.error('❌ Error:', error.message);
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect to login
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

