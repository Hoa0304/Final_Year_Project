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
      id: 'games',
      title: 'Games',
      icon: 'game-controller',
      screen: 'Games',
      color: '#AF52DE',
      description: 'Play games & have fun',
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
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.menuItemDescription}>{item.description}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.menuGrid}>
            {menuItems.slice(3, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.menuItemDescription}>{item.description}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools & Settings</Text>
          <View style={styles.menuList}>
            {menuItems.slice(5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={() => handleNavigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.listIconContainer, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.listItemDescription}>{item.description}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
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
    color: '#8E8E93',
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
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
  },
  menuItemDescription: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
  },
  menuList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  listItemDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
});

