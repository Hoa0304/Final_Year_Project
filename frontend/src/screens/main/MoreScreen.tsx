import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface MoreMenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  color: string;
  description?: string;
}

export default function MoreScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const menuItems: MoreMenuItem[] = [
    {
      id: 'chat',
      title: 'AI Chat',
      icon: 'sparkles',
      screen: 'Chat',
      color: '#007AFF',
      description: 'Chat with AI assistant',
    },
    {
      id: 'social',
      title: 'Social',
      icon: 'people',
      screen: 'Social',
      color: '#34C759',
      description: 'Community discussions',
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: 'chatbubbles',
      screen: 'Messages',
      color: '#FF9500',
      description: 'Direct messages',
    },
    {
      id: 'tasks',
      title: 'Tasks',
      icon: 'checkmark-circle',
      screen: 'Tasks',
      color: '#34C759',
      description: 'Complete tasks & earn rewards',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications',
      screen: 'Notifications',
      color: '#FF3B30',
      description: 'View all notifications',
    },
    {
      id: 'expense',
      title: 'Expense Management',
      icon: 'wallet',
      screen: 'ExpenseManagement',
      color: '#5856D6',
      description: 'Track expenses & budgets',
    },
  ];

  const handleNavigate = (screen: string) => {
    setShowMenu(false);
    // Navigate to screen - all screens are now in the Stack Navigator
    // @ts-ignore
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication</Text>
          <View style={styles.menuGrid}>
            {menuItems.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemInner}>
                  <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={26} color={item.color} />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.menuGrid}>
            {menuItems.slice(3, 4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemInner}>
                  <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={26} color={item.color} />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools & Settings</Text>
          <View style={styles.menuList}>
            {menuItems.slice(4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={() => handleNavigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.listIconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.listItemDescription}>{item.description}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#475569" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  menuItem: {
    width: '33.33%',
    padding: 6,
  },
  menuItemInner: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  menuItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  menuList: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  listIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  listItemDescription: {
    fontSize: 12,
    color: '#64748B',
  },
});

