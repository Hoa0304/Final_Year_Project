import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import DashboardScreen from '../screens/main/DashboardScreen';
import MarketplaceScreen from '../screens/main/MarketplaceScreen';
import TasksScreen from '../screens/main/TasksScreen';
import StocksScreen from '../screens/main/StocksScreen';
import GamesScreen from '../screens/main/GamesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import NotificationPreferencesScreen from '../screens/main/NotificationPreferencesScreen';
import ExpenseManagementScreen from '../screens/main/ExpenseManagementScreen';
import ChatScreen from '../screens/main/ChatScreen';
import SocialScreen from '../screens/main/SocialScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import MoreScreen from '../screens/main/MoreScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminTasksScreen from '../screens/admin/AdminTasksScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminGameBuilderScreen from '../screens/admin/AdminGameBuilderScreen';
import VoucherManagementScreen from '../screens/admin/VoucherManagementScreen';

// Vendor screens
import VendorProductsScreen from '../screens/vendor/VendorProductsScreen';

// Detail screens
import ProductDetailScreen from '../screens/detail/ProductDetailScreen';
import StockDetailScreen from '../screens/detail/StockDetailScreen';
import PortfolioScreen from '../screens/detail/PortfolioScreen';
import TransactionsScreen from '../screens/detail/TransactionsScreen';
import PurchaseHistoryScreen from '../screens/detail/PurchaseHistoryScreen';
import ShoppingCartScreen from '../screens/detail/ShoppingCartScreen';
import TicTacToeScreen from '../screens/detail/TicTacToeScreen';
import QuizGameScreen from '../screens/detail/QuizGameScreen';
import VendorShopScreen from '../screens/detail/VendorShopScreen';
import BlockchainScreen from '../screens/detail/BlockchainScreen';

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
          } else if (route.name === 'Stocks') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
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
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 15,
          paddingTop: 5,
          height: 65,
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
      <Tab.Screen name="Stocks" component={StocksScreen} />
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
 * Admin Vendor tab navigator
 */
function AdminVendorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Moderation') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'VendorPackages') {
            iconName = focused ? 'ribbon' : 'ribbon-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Moderation" component={AdminProductsScreen} options={{ title: 'Review Products' }} />
      <Tab.Screen name="Products" component={AdminProductsScreen} />
      <Tab.Screen name="VendorPackages" component={VoucherManagementScreen} options={{ title: 'VIP Packages' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * Admin Client tab navigator
 */
function AdminClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Users') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Finances') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'System') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#5856D6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Users" component={AdminUsersScreen} />
      <Tab.Screen name="Finances" component={AdminDashboardScreen} options={{ title: 'Invoices' }} />
      <Tab.Screen name="Games" component={AdminGameBuilderScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * Admin tab navigator (SuperAdmin)
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
          } else if (route.name === 'Users') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'GameBuilder') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF3B30',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Products" component={AdminProductsScreen} />
      <Tab.Screen name="Users" component={AdminUsersScreen} />
      <Tab.Screen name="GameBuilder" component={AdminGameBuilderScreen} />
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
          } else if (route.name === 'MyProducts') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Vouchers') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'VIP') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF9500',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="MyProducts" component={VendorProductsScreen} />
      <Tab.Screen name="VIP" component={ProfileScreen} options={{ title: 'Upgrade VIP' }} />
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
    <NavigationContainer>
      {user && <NotificationToastWrapper />}
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerBackTitleVisible: false, // Hide "Back" text on iOS, only show arrow
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
            {/* ... other common admin screens ... */}
          </>
        ) : user.role === 'admin_vendor' ? (
          // Admin Vendor stack
          <>
            <Stack.Screen 
              name="AdminVendorMain" 
              component={AdminVendorTabs}
              options={{ headerShown: false }}
            />
          </>
        ) : user.role === 'admin_client' ? (
          // Admin Client stack
          <>
            <Stack.Screen 
              name="AdminClientMain" 
              component={AdminClientTabs}
              options={{ headerShown: false }}
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
              name="Blockchain" 
              component={BlockchainScreen}
              options={{ title: 'Blockchain' }}
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
              options={{ title: 'Purchase History' }}
            />
            <Stack.Screen 
              name="ShoppingCart" 
              component={ShoppingCartScreen}
              options={{ title: 'Shopping Cart' }}
            />
            <Stack.Screen 
              name="TicTacToe" 
              component={TicTacToeScreen}
              options={{ 
                title: 'Tic Tac Toe',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="QuizGame" 
              component={QuizGameScreen}
              options={{ 
                title: 'Quiz Game',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen}
              options={{ title: 'Notifications' }}
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
              name="StockDetail" 
              component={StockDetailScreen}
              options={{ title: 'Stock Details' }}
            />
            <Stack.Screen 
              name="Portfolio" 
              component={PortfolioScreen}
              options={{ title: 'Portfolio' }}
            />
            <Stack.Screen 
              name="Transactions" 
              component={TransactionsScreen}
              options={{ title: 'Transactions' }}
            />
            <Stack.Screen 
              name="Blockchain" 
              component={BlockchainScreen}
              options={{ title: 'Blockchain' }}
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
              options={{ title: 'Purchase History' }}
            />
            <Stack.Screen 
              name="ShoppingCart" 
              component={ShoppingCartScreen}
              options={{ title: 'Shopping Cart' }}
            />
            <Stack.Screen 
              name="TicTacToe" 
              component={TicTacToeScreen}
              options={{ 
                title: 'Tic Tac Toe',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="QuizGame" 
              component={QuizGameScreen}
              options={{ 
                title: 'Quiz Game',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen}
              options={{ title: 'Notifications' }}
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
              name="Games" 
              component={GamesScreen}
              options={{ 
                title: 'Games',
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

