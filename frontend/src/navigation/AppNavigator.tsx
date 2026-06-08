import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import DashboardScreen from '../screens/main/DashboardScreen';
import MarketplaceScreen from '../screens/main/MarketplaceScreen';
import TasksScreen from '../screens/main/TasksScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import NotificationPreferencesScreen from '../screens/main/NotificationPreferencesScreen';
import TopUpScreen from '../screens/main/TopUpScreen';
import ExpenseManagementScreen from '../screens/main/ExpenseManagementScreen';
import ChatScreen from '../screens/main/ChatScreen';
import SocialScreen from '../screens/main/SocialScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import MoreScreen from '../screens/main/MoreScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminTasksScreen from '../screens/admin/AdminTasksScreen';
import AdminVendorStatsScreen from '../screens/admin/AdminVendorStatsScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminMoreScreen from '../screens/admin/AdminMoreScreen';

// Vendor screens
import VendorProductsScreen from '../screens/vendor/VendorProductsScreen';
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorOrdersScreen from '../screens/vendor/VendorOrdersScreen';
import VendorPackagesScreen from '../screens/vendor/VendorPackagesScreen';

// Detail screens
import ProductDetailScreen from '../screens/detail/ProductDetailScreen';
import TransactionsScreen from '../screens/detail/TransactionsScreen';
import PurchaseHistoryScreen from '../screens/detail/PurchaseHistoryScreen';
import ShoppingCartScreen from '../screens/detail/ShoppingCartScreen';
import VendorShopScreen from '../screens/detail/VendorShopScreen';
import CheckoutScreen from '../screens/detail/CheckoutScreen';
import OrderTrackingScreen from '../screens/detail/OrderTrackingScreen';

import { useAuth } from '../context/AuthContext';
import NotificationToastWrapper from '../components/NotificationToastWrapper';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main tab navigator for authenticated users
 */
function MainTabs({ userRole }: { userRole: string }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'Social') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'apps' : 'apps-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#64748B',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Admin tab navigator (Unified Admin Console)
 */
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'AdminDashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'apps' : 'apps-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#64748B',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ tabBarLabel: 'Overview' }} />
      <Tab.Screen name="Products" component={AdminProductsScreen} options={{ tabBarLabel: 'Products' }} />
      <Tab.Screen name="More" component={AdminMoreScreen} options={{ tabBarLabel: 'More' }} />
    </Tab.Navigator>
  );
}

/**
 * Vendor tab navigator
 */
function VendorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'MyProducts') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#64748B',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={VendorDashboardScreen} />
      <Tab.Screen name="Orders" component={VendorOrdersScreen} />
      <Tab.Screen name="MyProducts" component={VendorProductsScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * Main app navigator
 * Handles authentication flow and main app navigation
 */
export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show loading screen
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {user && <NotificationToastWrapper />}
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#0F172A',
          },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerBackTitleVisible: false,
        }}
      >
        {!user ? (
          // Auth stack
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : user.role === 'admin' ? (
          // Admin stack
          <>
            <Stack.Screen
              name="AdminMain"
              component={AdminTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Orders"
              component={AdminOrdersScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Vendors"
              component={AdminVendorStatsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="TopUp"
              component={TopUpScreen}
              options={{
                title: 'Top Up Coins',
                headerShown: false,
              }}
            />
          </>
        ) : user.role === 'vendor' ? (
          // Vendor stack
          <>
            <Stack.Screen
              name="VendorMain"
              component={VendorTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TopUp"
              component={TopUpScreen}
              options={{
                title: 'Top Up Coins',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ title: 'Product Details' }}
            />
            <Stack.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{ title: 'Transactions' }}
            />
            <Stack.Screen
              name="ExpenseManagement"
              component={ExpenseManagementScreen}
              options={{
                title: 'Expense Management',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="PurchaseHistory"
              component={PurchaseHistoryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ShoppingCart"
              component={ShoppingCartScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ title: 'Checkout' }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              options={{ title: 'Order Tracking' }}
            />
            <Stack.Screen
              name="VendorPackages"
              component={VendorPackagesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NotificationPreferences"
              component={NotificationPreferencesScreen}
              options={{ title: 'Notification Settings' }}
            />
            <Stack.Screen
              name="VendorShop"
              component={VendorShopScreen}
              options={{
                title: 'Vendor Shop',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                title: 'AI Chat Assistant',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Social"
              component={SocialScreen}
              options={{
                title: 'Social Discussions',
                headerShown: false,
              }}
            />
          </>
        ) : (
          // User stack
          <>
            <Stack.Screen
              name="Main"
              options={{ headerShown: false }}
            >
              {() => <MainTabs userRole={user.role} />}
            </Stack.Screen>
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ title: 'Product Details' }}
            />
            <Stack.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{ title: 'Transactions' }}
            />
            <Stack.Screen
              name="ExpenseManagement"
              component={ExpenseManagementScreen}
              options={{
                title: 'Expense Management',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="PurchaseHistory"
              component={PurchaseHistoryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ShoppingCart"
              component={ShoppingCartScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ title: 'Checkout' }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              options={{ title: 'Order Tracking' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NotificationPreferences"
              component={NotificationPreferencesScreen}
              options={{ title: 'Notification Settings' }}
            />
            <Stack.Screen
              name="VendorShop"
              component={VendorShopScreen}
              options={{ title: 'Vendor Shop' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                title: 'AI Chat Assistant',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Social"
              component={SocialScreen}
              options={{
                title: 'Social Discussions',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Messages"
              component={MessagesScreen}
              options={{
                title: 'Messages',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Tasks"
              component={TasksScreen}
              options={{
                title: 'Tasks',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="TopUp"
              component={TopUpScreen}
              options={{
                title: 'Top Up Coins',
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

