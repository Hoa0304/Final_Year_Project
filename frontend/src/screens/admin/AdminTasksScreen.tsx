import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  Switch,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../config/api';
import { getGames, Game } from '../../services/game.service';
import { getProducts, Product } from '../../services/product.service';
import { getStocks, Stock } from '../../services/stock.service';

interface Task {
  id: string;
  title: string;
  description?: string;
  reward_amount: number;
  is_active: boolean;
  created_at: string;
  completionCount?: number; // Number of users who completed this task
  validation_rule?: {
    type: 'manual' | 'purchase' | 'play_game' | 'buy_stock' | 'complete_tasks';
    count?: number;
    productKeyword?: string;
    gameId?: string;
    stockSymbol?: string;
  } | null;
}

export default function AdminTasksScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [ruleTypePickerVisible, setRuleTypePickerVisible] = useState(false);
  const [gamePickerVisible, setGamePickerVisible] = useState(false);
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [stockPickerVisible, setStockPickerVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: '',
    isActive: true,
    validationRuleType: 'manual' as 'manual' | 'purchase' | 'play_game' | 'buy_stock' | 'complete_tasks' | '',
    validationRuleCount: '1',
    validationRuleProductKeyword: '',
    validationRuleGameId: '',
    validationRuleGameName: '',
    validationRuleProductId: '',
    validationRuleProductName: '',
    validationRuleStockSymbol: '',
    validationRuleStockName: '',
  });

  // Fetch games and products for selection
  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: getGames,
    enabled: formData.validationRuleType === 'play_game', // Only fetch when needed
  });

  const { data: products = [] } = useQuery({
    queryKey: ['adminProductsForTask'],
    queryFn: () => getProducts({ limit: 1000 }), // Get all products
    enabled: formData.validationRuleType === 'purchase' || modalVisible, // Fetch when needed or modal is open
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['stocks'],
    queryFn: getStocks,
    enabled: formData.validationRuleType === 'buy_stock' || modalVisible, // Fetch when needed or modal is open
  });

  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminTasks'],
    queryFn: async () => {
      const res = await api.get('/admin/tasks');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/admin/tasks', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Task created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create task');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/admin/tasks/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Task updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/tasks/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
      Alert.alert('Success', 'Task deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete task');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      rewardAmount: '',
      isActive: true,
      validationRuleType: 'manual',
      validationRuleCount: '1',
      validationRuleProductKeyword: '',
      validationRuleGameId: '',
      validationRuleGameName: '',
      validationRuleProductId: '',
      validationRuleProductName: '',
      validationRuleStockSymbol: '',
    });
    setEditingTask(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    const rule = task.validation_rule;
    setFormData({
      title: task.title,
      description: task.description || '',
      rewardAmount: task.reward_amount.toString(),
      isActive: task.is_active,
      validationRuleType: rule?.type || 'manual',
      validationRuleCount: rule?.count?.toString() || '1',
      validationRuleProductKeyword: rule?.productKeyword || '',
      validationRuleGameId: rule?.gameId || '',
      validationRuleGameName: '',
      validationRuleProductId: '',
      validationRuleProductName: '',
      validationRuleStockSymbol: rule?.stockSymbol || '',
      validationRuleStockName: '',
    });
    setModalVisible(true);
  };

  // Update game/product/stock names when data loads and we're editing
  useEffect(() => {
    if (editingTask && editingTask.validation_rule && modalVisible) {
      const rule = editingTask.validation_rule;
      
      if (rule.gameId && games.length > 0) {
        const game = games.find(g => g.id === rule.gameId);
        if (game && formData.validationRuleGameName !== game.name) {
          setFormData(prev => ({ ...prev, validationRuleGameName: game.name }));
        }
      }
      
      if (rule.productKeyword && products.length > 0) {
        // Try to find matching product
        const product = products.find(p => 
          p.name.toLowerCase().includes(rule.productKeyword?.toLowerCase() || '') ||
          p.description?.toLowerCase().includes(rule.productKeyword?.toLowerCase() || '')
        );
        if (product && formData.validationRuleProductName !== product.name) {
          setFormData(prev => ({ 
            ...prev, 
            validationRuleProductName: product.name,
            validationRuleProductId: product.id,
          }));
        }
      }

      if (rule.stockSymbol && stocks.length > 0) {
        const stock = stocks.find(s => s.symbol === rule.stockSymbol);
        if (stock && formData.validationRuleStockName !== stock.name) {
          setFormData(prev => ({ 
            ...prev, 
            validationRuleStockName: stock.name,
          }));
        }
      }
    }
  }, [games, products, stocks, editingTask, modalVisible]);

  const handleSave = () => {
    if (!formData.title || !formData.rewardAmount) {
      Alert.alert('Error', 'Title and reward amount are required');
      return;
    }

    // Dismiss keyboard before submitting
    Keyboard.dismiss();

    // Build validation rule
    let validationRule: any = null;
    if (formData.validationRuleType && formData.validationRuleType !== '') {
      validationRule = {
        type: formData.validationRuleType,
      };

      // Add count for rules that need it
      if (formData.validationRuleType !== 'manual') {
        const count = parseInt(formData.validationRuleCount) || 1;
        validationRule.count = count;
      }

      // Add specific fields based on rule type
      if (formData.validationRuleType === 'purchase') {
        // Use productKeyword if provided, otherwise use productId
        if (formData.validationRuleProductKeyword) {
          validationRule.productKeyword = formData.validationRuleProductKeyword.trim();
        } else if (formData.validationRuleProductId) {
          // If product selected, extract keyword from product name
          const selectedProduct = products.find(p => p.id === formData.validationRuleProductId);
          if (selectedProduct) {
            validationRule.productKeyword = selectedProduct.name.toLowerCase();
          }
        }
      }
      if (formData.validationRuleType === 'play_game' && formData.validationRuleGameId) {
        validationRule.gameId = formData.validationRuleGameId.trim();
      }
      if (formData.validationRuleType === 'buy_stock' && formData.validationRuleStockSymbol) {
        validationRule.stockSymbol = formData.validationRuleStockSymbol.trim();
      }
    }

    const data = {
      title: formData.title,
      description: formData.description || undefined,
      rewardAmount: parseFloat(formData.rewardAmount),
      isActive: formData.isActive,
      validationRule: validationRule,
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(task.id),
        },
      ]
    );
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        {item.description && <Text style={styles.taskDescription}>{item.description}</Text>}
        <Text style={styles.taskReward}>Reward: {item.reward_amount} coins</Text>
        <View style={styles.taskMeta}>
          <Text style={[styles.taskStatus, !item.is_active && styles.inactive]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
          <Text style={styles.completionCount}>
            {item.completionCount !== undefined ? `${item.completionCount} completed` : '0 completed'}
          </Text>
        </View>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tasks Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text>Loading...</Text>
          </View>
        ) : (
      <FlatList
        data={response?.tasks || []}
        keyExtractor={(item) => item.id}
            renderItem={renderTask}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No tasks found</Text>
          </View>
            }
          />
        )}

        {/* Create/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            Keyboard.dismiss();
            setModalVisible(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.modalContent}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        {editingTask ? 'Edit Task' : 'Create Task'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Keyboard.dismiss();
                          setModalVisible(false);
                        }}
                      >
                        <Ionicons name="close" size={24} color="#000" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Task Title *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Task Title *"
                        placeholderTextColor="#000"
                        value={formData.title}
                        onChangeText={(text) => setFormData({ ...formData, title: text })}
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Description"
                        placeholderTextColor="#000"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        multiline
                        numberOfLines={3}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        blurOnSubmit={true}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Reward Amount *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Reward Amount *"
                        placeholderTextColor="#000"
                        value={formData.rewardAmount}
                        onChangeText={(text) => setFormData({ ...formData, rewardAmount: text })}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <View style={styles.switchContainer}>
                      <Text style={styles.switchLabel}>Active</Text>
                      <Switch
                        value={formData.isActive}
                        onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                      />
                    </View>

                    {/* Validation Rule Section */}
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionTitle}>Validation Rule</Text>
                    <Text style={styles.sectionDescription}>
                      Set how the system will check if users completed this task
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Rule Type</Text>
                      <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => setRuleTypePickerVisible(true)}
                      >
                        <Text style={styles.selectButtonText}>
                          {formData.validationRuleType === 'manual' && 'Manual (can complete directly)'}
                          {formData.validationRuleType === 'purchase' && 'Purchase Product(s)'}
                          {formData.validationRuleType === 'play_game' && 'Play Game(s)'}
                          {formData.validationRuleType === 'buy_stock' && 'Buy Stock(s)'}
                          {formData.validationRuleType === 'complete_tasks' && 'Complete Task(s)'}
                          {!formData.validationRuleType && 'Select Rule Type'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                      </TouchableOpacity>

                      {/* Rule Type Picker Modal */}
                      <Modal
                        visible={ruleTypePickerVisible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setRuleTypePickerVisible(false)}
                      >
                        <TouchableWithoutFeedback onPress={() => setRuleTypePickerVisible(false)}>
                          <View style={styles.pickerModalOverlay}>
                            <TouchableWithoutFeedback onPress={() => {}}>
                              <View style={styles.pickerModalContent}>
                                <View style={styles.pickerModalHeader}>
                                  <Text style={styles.pickerModalTitle}>Select Rule Type</Text>
                                  <TouchableOpacity onPress={() => setRuleTypePickerVisible(false)}>
                                    <Ionicons name="close" size={24} color="#000" />
                                  </TouchableOpacity>
                                </View>
                                <ScrollView>
                                  {[
                                    { label: 'Manual (can complete directly)', value: 'manual' },
                                    { label: 'Purchase Product(s)', value: 'purchase' },
                                    { label: 'Play Game(s)', value: 'play_game' },
                                    { label: 'Buy Stock(s)', value: 'buy_stock' },
                                    { label: 'Complete Task(s)', value: 'complete_tasks' },
                                  ].map((option) => (
                                    <TouchableOpacity
                                      key={option.value}
                                      style={[
                                        styles.pickerOption,
                                        formData.validationRuleType === option.value && styles.pickerOptionActive,
                                      ]}
                                      onPress={() => {
                                        setFormData({ ...formData, validationRuleType: option.value as any });
                                        setRuleTypePickerVisible(false);
                                      }}
                                    >
                                      <Text
                                        style={[
                                          styles.pickerOptionText,
                                          formData.validationRuleType === option.value && styles.pickerOptionTextActive,
                                        ]}
                                      >
                                        {option.label}
                                      </Text>
                                      {formData.validationRuleType === option.value && (
                                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                                      )}
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            </TouchableWithoutFeedback>
                          </View>
                        </TouchableWithoutFeedback>
                      </Modal>
                    </View>

                    {formData.validationRuleType !== 'manual' && (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Required Count</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="1"
                            placeholderTextColor="#000"
                            value={formData.validationRuleCount}
                            onChangeText={(text) => setFormData({ ...formData, validationRuleCount: text })}
                            keyboardType="number-pad"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                        </View>

                        {formData.validationRuleType === 'purchase' && (
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Product (optional)</Text>
                            <Text style={styles.hintText}>
                              Select a product or leave empty to allow any product. You can also enter keyword manually below.
                            </Text>
                            <TouchableOpacity
                              style={styles.selectButton}
                              onPress={() => setProductPickerVisible(true)}
                            >
                              <Text style={styles.selectButtonText}>
                                {formData.validationRuleProductName || 'Select Product (optional)'}
                              </Text>
                              <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>
                            
                            {/* Product Picker Modal */}
                            <Modal
                              visible={productPickerVisible}
                              transparent={true}
                              animationType="slide"
                              onRequestClose={() => setProductPickerVisible(false)}
                            >
                              <TouchableWithoutFeedback onPress={() => setProductPickerVisible(false)}>
                                <View style={styles.pickerModalOverlay}>
                                  <TouchableWithoutFeedback onPress={() => {}}>
                                    <View style={styles.pickerModalContent}>
                                      <View style={styles.pickerModalHeader}>
                                        <Text style={styles.pickerModalTitle}>Select Product</Text>
                                        <TouchableOpacity onPress={() => setProductPickerVisible(false)}>
                                          <Ionicons name="close" size={24} color="#000" />
                                        </TouchableOpacity>
                                      </View>
                                      <ScrollView>
                                        <TouchableOpacity
                                          style={[
                                            styles.pickerOption,
                                            !formData.validationRuleProductId && styles.pickerOptionActive,
                                          ]}
                                          onPress={() => {
                                            setFormData({
                                              ...formData,
                                              validationRuleProductId: '',
                                              validationRuleProductName: '',
                                              validationRuleProductKeyword: '',
                                            });
                                            setProductPickerVisible(false);
                                          }}
                                        >
                                          <Text
                                            style={[
                                              styles.pickerOptionText,
                                              !formData.validationRuleProductId && styles.pickerOptionTextActive,
                                            ]}
                                          >
                                            Any Product
                                          </Text>
                                          {!formData.validationRuleProductId && (
                                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                                          )}
                                        </TouchableOpacity>
                                        {products.map((product) => (
                                          <TouchableOpacity
                                            key={product.id}
                                            style={[
                                              styles.pickerOption,
                                              formData.validationRuleProductId === product.id && styles.pickerOptionActive,
                                            ]}
                                            onPress={() => {
                                              setFormData({
                                                ...formData,
                                                validationRuleProductId: product.id,
                                                validationRuleProductName: product.name,
                                                validationRuleProductKeyword: product.name.toLowerCase(),
                                              });
                                              setProductPickerVisible(false);
                                            }}
                                          >
                                            <View style={{ flex: 1 }}>
                                              <Text
                                                style={[
                                                  styles.pickerOptionText,
                                                  formData.validationRuleProductId === product.id && styles.pickerOptionTextActive,
                                                ]}
                                              >
                                                {product.name}
                                              </Text>
                                              {product.category && (
                                                <Text style={styles.pickerOptionSubtext}>{product.category}</Text>
                                              )}
                                            </View>
                                            {formData.validationRuleProductId === product.id && (
                                              <Ionicons name="checkmark" size={20} color="#007AFF" />
                                            )}
                                          </TouchableOpacity>
                                        ))}
                                      </ScrollView>
                                    </View>
                                  </TouchableWithoutFeedback>
                                </View>
                              </TouchableWithoutFeedback>
                            </Modal>

                            <Text style={[styles.hintText, { marginTop: 10 }]}>
                              Or enter keyword manually:
                            </Text>
                            <TextInput
                              style={styles.input}
                              placeholder="laptop, iPhone, etc."
                              placeholderTextColor="#000"
                              value={formData.validationRuleProductKeyword}
                              onChangeText={(text) => setFormData({ ...formData, validationRuleProductKeyword: text, validationRuleProductId: '', validationRuleProductName: '' })}
                              returnKeyType="done"
                              onSubmitEditing={Keyboard.dismiss}
                            />
                          </View>
                        )}

                        {formData.validationRuleType === 'play_game' && (
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Game (optional)</Text>
                            <Text style={styles.hintText}>
                              Select a specific game or leave empty to count any game
                            </Text>
                            <TouchableOpacity
                              style={styles.selectButton}
                              onPress={() => setGamePickerVisible(true)}
                            >
                              <Text style={styles.selectButtonText}>
                                {formData.validationRuleGameName || 'Select Game (optional)'}
                              </Text>
                              <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>

                            {/* Game Picker Modal */}
                            <Modal
                              visible={gamePickerVisible}
                              transparent={true}
                              animationType="slide"
                              onRequestClose={() => setGamePickerVisible(false)}
                            >
                              <TouchableWithoutFeedback onPress={() => setGamePickerVisible(false)}>
                                <View style={styles.pickerModalOverlay}>
                                  <TouchableWithoutFeedback onPress={() => {}}>
                                    <View style={styles.pickerModalContent}>
                                      <View style={styles.pickerModalHeader}>
                                        <Text style={styles.pickerModalTitle}>Select Game</Text>
                                        <TouchableOpacity onPress={() => setGamePickerVisible(false)}>
                                          <Ionicons name="close" size={24} color="#000" />
                                        </TouchableOpacity>
                                      </View>
                                      <ScrollView>
                                        <TouchableOpacity
                                          style={[
                                            styles.pickerOption,
                                            !formData.validationRuleGameId && styles.pickerOptionActive,
                                          ]}
                                          onPress={() => {
                                            setFormData({
                                              ...formData,
                                              validationRuleGameId: '',
                                              validationRuleGameName: '',
                                            });
                                            setGamePickerVisible(false);
                                          }}
                                        >
                                          <Text
                                            style={[
                                              styles.pickerOptionText,
                                              !formData.validationRuleGameId && styles.pickerOptionTextActive,
                                            ]}
                                          >
                                            Any Game
                                          </Text>
                                          {!formData.validationRuleGameId && (
                                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                                          )}
                                        </TouchableOpacity>
                                        {games.map((game) => (
                                          <TouchableOpacity
                                            key={game.id}
                                            style={[
                                              styles.pickerOption,
                                              formData.validationRuleGameId === game.id && styles.pickerOptionActive,
                                            ]}
                                            onPress={() => {
                                              setFormData({
                                                ...formData,
                                                validationRuleGameId: game.id,
                                                validationRuleGameName: game.name,
                                              });
                                              setGamePickerVisible(false);
                                            }}
                                          >
                                            <View style={{ flex: 1 }}>
                                              <Text
                                                style={[
                                                  styles.pickerOptionText,
                                                  formData.validationRuleGameId === game.id && styles.pickerOptionTextActive,
                                                ]}
                                              >
                                                {game.name}
                                              </Text>
                                              {game.description && (
                                                <Text style={styles.pickerOptionSubtext} numberOfLines={1}>
                                                  {game.description}
                                                </Text>
                                              )}
                                            </View>
                                            {formData.validationRuleGameId === game.id && (
                                              <Ionicons name="checkmark" size={20} color="#007AFF" />
                                            )}
                                          </TouchableOpacity>
                                        ))}
                                      </ScrollView>
                                    </View>
                                  </TouchableWithoutFeedback>
                                </View>
                              </TouchableWithoutFeedback>
                            </Modal>
                          </View>
                        )}

                        {formData.validationRuleType === 'buy_stock' && (
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Stock (optional)</Text>
                            <Text style={styles.hintText}>
                              Select a specific stock or leave empty to count any stock
                            </Text>
                            <TouchableOpacity
                              style={styles.selectButton}
                              onPress={() => setStockPickerVisible(true)}
                            >
                              <Text style={styles.selectButtonText}>
                                {formData.validationRuleStockName || formData.validationRuleStockSymbol || 'Select Stock (optional)'}
                              </Text>
                              <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>

                            {/* Stock Picker Modal */}
                            <Modal
                              visible={stockPickerVisible}
                              transparent={true}
                              animationType="slide"
                              onRequestClose={() => setStockPickerVisible(false)}
                            >
                              <TouchableWithoutFeedback onPress={() => setStockPickerVisible(false)}>
                                <View style={styles.pickerModalOverlay}>
                                  <TouchableWithoutFeedback onPress={() => {}}>
                                    <View style={styles.pickerModalContent}>
                                      <View style={styles.pickerModalHeader}>
                                        <Text style={styles.pickerModalTitle}>Select Stock</Text>
                                        <TouchableOpacity onPress={() => setStockPickerVisible(false)}>
                                          <Ionicons name="close" size={24} color="#000" />
                                        </TouchableOpacity>
                                      </View>
                                      <ScrollView>
                                        <TouchableOpacity
                                          style={[
                                            styles.pickerOption,
                                            !formData.validationRuleStockSymbol && styles.pickerOptionActive,
                                          ]}
                                          onPress={() => {
                                            setFormData({
                                              ...formData,
                                              validationRuleStockSymbol: '',
                                              validationRuleStockName: '',
                                            });
                                            setStockPickerVisible(false);
                                          }}
                                        >
                                          <Text
                                            style={[
                                              styles.pickerOptionText,
                                              !formData.validationRuleStockSymbol && styles.pickerOptionTextActive,
                                            ]}
                                          >
                                            Any Stock
                                          </Text>
                                          {!formData.validationRuleStockSymbol && (
                                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                                          )}
                                        </TouchableOpacity>
                                        {stocks.map((stock) => (
                                          <TouchableOpacity
                                            key={stock.id}
                                            style={[
                                              styles.pickerOption,
                                              formData.validationRuleStockSymbol === stock.symbol && styles.pickerOptionActive,
                                            ]}
                                            onPress={() => {
                                              setFormData({
                                                ...formData,
                                                validationRuleStockSymbol: stock.symbol,
                                                validationRuleStockName: stock.name,
                                              });
                                              setStockPickerVisible(false);
                                            }}
                                          >
                                            <View style={{ flex: 1 }}>
                                              <Text
                                                style={[
                                                  styles.pickerOptionText,
                                                  formData.validationRuleStockSymbol === stock.symbol && styles.pickerOptionTextActive,
                                                ]}
                                              >
                                                {stock.symbol} - {stock.name}
                                              </Text>
                                              <Text style={styles.pickerOptionSubtext}>
                                                Price: {stock.current_price.toFixed(2)} coins
                                              </Text>
                                            </View>
                                            {formData.validationRuleStockSymbol === stock.symbol && (
                                              <Ionicons name="checkmark" size={20} color="#007AFF" />
                                            )}
                                          </TouchableOpacity>
                                        ))}
                                      </ScrollView>
                                    </View>
                                  </TouchableWithoutFeedback>
                                </View>
                              </TouchableWithoutFeedback>
                            </Modal>
                          </View>
                        )}
                      </>
                    )}

                    <TouchableOpacity
                      style={[styles.saveButton, (createMutation.isPending || updateMutation.isPending) && styles.buttonDisabled]}
                      onPress={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Text style={styles.saveButtonText}>
                        {createMutation.isPending || updateMutation.isPending
                          ? 'Saving...'
                          : editingTask
                          ? 'Update'
                          : 'Create'}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 10,
  },
  taskCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  taskReward: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 3,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  taskStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  inactive: {
    color: '#FF3B30',
  },
  completionCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#000',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerOptionActive: {
    backgroundColor: '#f0f8ff',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#000',
  },
  pickerOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  pickerOptionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
