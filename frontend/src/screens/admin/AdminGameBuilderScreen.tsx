import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGameTemplates,
  getGameInstances,
  getGameInstanceById,
  createGameInstance,
  updateGameInstance,
  deleteGameInstance,
  getGameContent,
  addGameContent,
  updateGameContent,
  deleteGameContent,
  GameTemplate,
  GameInstance,
  GameContent,
} from '../../services/game-builder.service';
import ImageUploadPicker from '../../components/ImageUploadPicker';

export default function AdminGameBuilderScreen() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null);
  const [editingInstance, setEditingInstance] = useState<GameInstance | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reward_amount: '0',
    max_plays_per_day: '10',
    difficulty_level: 'medium',
    config: {} as any,
  });
  const [contentFormData, setContentFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 10,
    // For word game
    word: '',
    hint: '',
    // For memory match
    card1Image: '',
    card1Text: '',
    card2Image: '',
    card2Text: '',
  });
  const [selectedGameType, setSelectedGameType] = useState<string>('quiz');

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['gameTemplates'],
    queryFn: getGameTemplates,
  });

  const { data: instances, isLoading: isLoadingInstances } = useQuery({
    queryKey: ['gameInstances'],
    queryFn: getGameInstances,
  });

  const { data: gameContent, refetch: refetchContent } = useQuery({
    queryKey: ['gameContent', selectedGameId],
    queryFn: () => getGameContent(selectedGameId!),
    enabled: !!selectedGameId && contentModalVisible,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateGameInstance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameInstances'] });
      setModalVisible(false);
      setEditingInstance(null);
      resetForm();
      Alert.alert('Success', 'Game updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update game');
    },
  });

  const addContentMutation = useMutation({
    mutationFn: (data: any) => addGameContent(selectedGameId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameContent', selectedGameId] });
      refetchContent();
      resetContentForm();
      Alert.alert('Success', 'Content added successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add content');
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: (contentId: string) => deleteGameContent(selectedGameId!, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameContent', selectedGameId] });
      refetchContent();
      Alert.alert('Success', 'Content deleted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete content');
    },
  });

  const createMutation = useMutation({
    mutationFn: createGameInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameInstances'] });
      setModalVisible(false);
      setFormData({
        name: '',
        description: '',
        reward_amount: '0',
        max_plays_per_day: '10',
        difficulty_level: 'medium',
        config: {},
      });
      setSelectedTemplate(null);
      Alert.alert('Success', 'Game created successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create game');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGameInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameInstances'] });
      Alert.alert('Success', 'Game deleted successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete game');
    },
  });

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      reward_amount: '0',
      max_plays_per_day: '10',
      difficulty_level: 'medium',
      config: {},
    });
    setSelectedTemplate(null);
    setEditingInstance(null);
  }

  function resetContentForm() {
    setContentFormData({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 10,
      word: '',
      hint: '',
      card1Image: '',
      card1Text: '',
      card2Image: '',
      card2Text: '',
    });
  }

  function handleSelectTemplate(template: GameTemplate) {
    setSelectedTemplate(template);
    setEditingInstance(null);
    setFormData({
      name: '',
      description: '',
      reward_amount: '0',
      max_plays_per_day: '10',
      difficulty_level: 'medium',
      config: template.default_config || {},
    });
    setModalVisible(true);
  }

  function handleEditGame(instance: GameInstance) {
    setEditingInstance(instance);
    setSelectedTemplate(null);
    setFormData({
      name: instance.name,
      description: instance.description || '',
      reward_amount: instance.reward_amount.toString(),
      max_plays_per_day: instance.max_plays_per_day.toString(),
      difficulty_level: instance.difficulty_level || 'medium',
      config: instance.config || {},
    });
    setModalVisible(true);
  }

  function handleManageContent(game: GameInstance) {
    setSelectedGameId(game.id);
    setSelectedGameType(game.game_templates?.type || 'quiz');
    setContentModalVisible(true);
  }

  function handleAddContent() {
    let contentData: any = {};
    let contentType = 'question';

    if (selectedGameType === 'quiz') {
      if (!contentFormData.question || contentFormData.options.filter(o => o).length < 2) {
        Alert.alert('Error', 'Please fill in question and at least 2 options');
        return;
      }
      contentType = 'question';
      contentData = {
        question: contentFormData.question,
        options: contentFormData.options.filter(o => o),
        correctAnswer: contentFormData.correctAnswer,
        points: contentFormData.points,
      };
    } else if (selectedGameType === 'word') {
      if (!contentFormData.word) {
        Alert.alert('Error', 'Please enter a word');
        return;
      }
      contentType = 'word';
      contentData = {
        word: contentFormData.word,
        hint: contentFormData.hint || '',
      };
    } else if (selectedGameType === 'memory_match') {
      if (!contentFormData.card1Text || !contentFormData.card2Text) {
        Alert.alert('Error', 'Please fill in both card texts');
        return;
      }
      contentType = 'card_pair';
      contentData = {
        card1: {
          image: contentFormData.card1Image || null,
          text: contentFormData.card1Text,
        },
        card2: {
          image: contentFormData.card2Image || null,
          text: contentFormData.card2Text,
        },
        pairId: Date.now().toString(), // Unique pair ID
      };
    } else {
      Alert.alert('Error', 'Unsupported game type');
      return;
    }

    addContentMutation.mutate({
      content_type: contentType,
      content_data: contentData,
    });
  }

  function handleDeleteContent(contentId: string) {
    Alert.alert('Delete Content', 'Are you sure you want to delete this content?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteContentMutation.mutate(contentId),
      },
    ]);
  }

  function handleSaveGame() {
    if (!formData.name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    Keyboard.dismiss();

    const gameData = {
      name: formData.name,
      description: formData.description || undefined,
      config: formData.config,
      reward_amount: parseFloat(formData.reward_amount) || 0,
      max_plays_per_day: parseInt(formData.max_plays_per_day) || 10,
      difficulty_level: formData.difficulty_level,
    };

    if (editingInstance) {
      updateMutation.mutate({ id: editingInstance.id, data: gameData });
    } else if (selectedTemplate) {
      createMutation.mutate({
        template_id: selectedTemplate.id,
        ...gameData,
      });
    }
  }

  function handleDeleteGame(id: string) {
    Alert.alert('Delete Game', 'Are you sure you want to delete this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  }

  function renderTemplate({ item }: { item: GameTemplate }) {
    return (
      <TouchableOpacity
        style={styles.templateCard}
        onPress={() => handleSelectTemplate(item)}
        activeOpacity={0.7}
      >
        <View style={styles.templateIcon}>
          <Ionicons name="game-controller" size={32} color="#007AFF" />
        </View>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{item.name}</Text>
          {item.description && <Text style={styles.templateDescription}>{item.description}</Text>}
          <Text style={styles.templateType}>Type: {item.type}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
    );
  }

  function renderInstance({ item }: { item: GameInstance }) {
    return (
      <View style={styles.instanceCard}>
        <View style={styles.instanceHeader}>
          <View style={styles.instanceInfo}>
            <Text style={styles.instanceName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.instanceDescription}>{item.description}</Text>
            )}
            <Text style={styles.instanceType}>
              Template: {item.game_templates?.name || 'Unknown'}
            </Text>
          </View>
          <View style={styles.instanceBadge}>
            <Text style={styles.instanceBadgeText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <View style={styles.instanceFooter}>
          <View style={styles.instanceStats}>
            <Ionicons name="cash" size={16} color="#FF9500" />
            <Text style={styles.instanceStatText}>{item.reward_amount} coins</Text>
            <Ionicons name="time" size={16} color="#666" style={{ marginLeft: 12 }} />
            <Text style={styles.instanceStatText}>{item.max_plays_per_day}/day</Text>
          </View>
          <View style={styles.instanceActions}>
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => handleEditGame(item)}
            >
              <Ionicons name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>
            {(item.game_templates?.type === 'quiz' || 
              item.game_templates?.type === 'word' || 
              item.game_templates?.type === 'memory_match') && (
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => handleManageContent(item)}
              >
                <Ionicons name="list" size={20} color="#34C759" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => handleDeleteGame(item.id)}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (isLoadingTemplates || isLoadingInstances) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Game Builder</Text>
          <Text style={styles.subtitle}>Create custom games for users</Text>
        </View>

        {/* Templates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Templates</Text>
          <Text style={styles.sectionDescription}>
            Select a template to create a new game
          </Text>
          <FlatList
            data={templates || []}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No templates available</Text>
              </View>
            }
          />
        </View>

        {/* Game Instances Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Created Games</Text>
          <Text style={styles.sectionDescription}>
            {instances?.length || 0} game(s) created
          </Text>
          <FlatList
            data={instances || []}
            renderItem={renderInstance}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No games created yet</Text>
                <Text style={styles.emptySubtext}>Select a template above to create one</Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Create Game Modal */}
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
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingInstance ? 'Edit Game' : `Create Game: ${selectedTemplate?.name || ''}`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setModalVisible(false);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Game Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="Enter game name"
                      placeholderTextColor="#000"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      placeholder="Enter game description"
                      placeholderTextColor="#000"
                      multiline
                      numberOfLines={3}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, styles.formGroupHalf]}>
                      <Text style={styles.label}>Reward Amount</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.reward_amount}
                        onChangeText={(text) => setFormData({ ...formData, reward_amount: text })}
                        placeholder="0"
                        placeholderTextColor="#000"
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <View style={[styles.formGroup, styles.formGroupHalf]}>
                      <Text style={styles.label}>Max Plays/Day</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.max_plays_per_day}
                        onChangeText={(text) =>
                          setFormData({ ...formData, max_plays_per_day: text })
                        }
                        placeholder="10"
                        placeholderTextColor="#000"
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Difficulty Level</Text>
                    <View style={styles.radioGroup}>
                      {['easy', 'medium', 'hard'].map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.radioButton,
                            formData.difficulty_level === level && styles.radioButtonActive,
                          ]}
                          onPress={() => setFormData({ ...formData, difficulty_level: level })}
                        >
                          <Text
                            style={[
                              styles.radioButtonText,
                              formData.difficulty_level === level && styles.radioButtonTextActive,
                            ]}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Dynamic Config Form based on Template Schema */}
                  {selectedTemplate && selectedTemplate.config_schema && (
                    <View style={styles.configSection}>
                      <Text style={styles.sectionTitle}>Game Configuration</Text>
                      {Object.entries(selectedTemplate.config_schema.properties || {}).map(([key, schema]: [string, any]) => {
                        const value = formData.config[key] !== undefined ? formData.config[key] : (selectedTemplate.default_config[key] || '');
                        
                        if (schema.type === 'number') {
                          return (
                            <View key={key} style={styles.formGroup}>
                              <Text style={styles.label}>
                                {schema.title || key} {schema.minimum !== undefined && `(min: ${schema.minimum})`} {schema.maximum !== undefined && `(max: ${schema.maximum})`}
                              </Text>
                              <TextInput
                                style={styles.input}
                                value={value.toString()}
                                onChangeText={(text) => {
                                  const num = parseFloat(text) || 0;
                                  const min = schema.minimum !== undefined ? schema.minimum : 0;
                                  const max = schema.maximum !== undefined ? schema.maximum : Infinity;
                                  const finalValue = Math.max(min, Math.min(num, max));
                                  setFormData({
                                    ...formData,
                                    config: { ...formData.config, [key]: finalValue },
                                  });
                                }}
                                placeholder={schema.title || key}
                                placeholderTextColor="#000"
                                keyboardType="numeric"
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                              />
                            </View>
                          );
                        } else if (schema.type === 'boolean') {
                          return (
                            <View key={key} style={styles.formGroup}>
                              <View style={styles.switchRow}>
                                <Text style={styles.label}>{schema.title || key}</Text>
                                <TouchableOpacity
                                  style={[
                                    styles.switch,
                                    formData.config[key] && styles.switchActive,
                                  ]}
                                  onPress={() => {
                                    setFormData({
                                      ...formData,
                                      config: { ...formData.config, [key]: !formData.config[key] },
                                    });
                                  }}
                                >
                                  <View
                                    style={[
                                      styles.switchThumb,
                                      formData.config[key] && styles.switchThumbActive,
                                    ]}
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        } else if (schema.type === 'string' && schema.enum) {
                          return (
                            <View key={key} style={styles.formGroup}>
                              <Text style={styles.label}>{schema.title || key}</Text>
                              <View style={styles.selectGroup}>
                                {schema.enum.map((option: string) => (
                                  <TouchableOpacity
                                    key={option}
                                    style={[
                                      styles.selectOption,
                                      formData.config[key] === option && styles.selectOptionActive,
                                    ]}
                                    onPress={() => {
                                      setFormData({
                                        ...formData,
                                        config: { ...formData.config, [key]: option },
                                      });
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.selectOptionText,
                                        formData.config[key] === option && styles.selectOptionTextActive,
                                      ]}
                                    >
                                      {option}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  )}

                  {editingInstance && !selectedTemplate && (
                    <View style={styles.configSection}>
                      <Text style={styles.sectionTitle}>Game Configuration</Text>
                      <Text style={styles.configNote}>
                        Config: {JSON.stringify(formData.config, null, 2)}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      (createMutation.isLoading || updateMutation.isLoading) && styles.createButtonDisabled
                    ]}
                    onPress={handleSaveGame}
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.createButtonText}>
                        {editingInstance ? 'Update Game' : 'Create Game'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Content Editor Modal */}
      <Modal
        visible={contentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          Keyboard.dismiss();
          setContentModalVisible(false);
          setSelectedGameId(null);
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
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Manage Game Content</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setContentModalVisible(false);
                      setSelectedGameId(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Add New Content Form */}
                  <View style={styles.contentFormSection}>
                    {selectedGameType === 'quiz' && (
                      <>
                        <Text style={styles.sectionTitle}>Add Question</Text>
                        
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Question *</Text>
                          <TextInput
                            style={[styles.input, styles.textArea]}
                            value={contentFormData.question}
                            onChangeText={(text) => setContentFormData({ ...contentFormData, question: text })}
                            placeholder="Enter question"
                            placeholderTextColor="#000"
                            multiline
                            numberOfLines={2}
                          />
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Options *</Text>
                          {contentFormData.options.map((option, index) => (
                            <View key={index} style={styles.optionRow}>
                              <TouchableOpacity
                                style={styles.radioCircle}
                                onPress={() => setContentFormData({ ...contentFormData, correctAnswer: index })}
                              >
                                {contentFormData.correctAnswer === index && (
                                  <View style={styles.radioChecked} />
                                )}
                              </TouchableOpacity>
                              <TextInput
                                style={[styles.input, styles.optionInput]}
                                value={option}
                                onChangeText={(text) => {
                                  const newOptions = [...contentFormData.options];
                                  newOptions[index] = text;
                                  setContentFormData({ ...contentFormData, options: newOptions });
                                }}
                                placeholder={`Option ${index + 1}`}
                                placeholderTextColor="#000"
                              />
                            </View>
                          ))}
                          <Text style={styles.hintText}>Tap circle to mark correct answer</Text>
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Points</Text>
                          <TextInput
                            style={styles.input}
                            value={contentFormData.points.toString()}
                            onChangeText={(text) =>
                              setContentFormData({ ...contentFormData, points: parseInt(text) || 10 })
                            }
                            placeholder="10"
                            placeholderTextColor="#000"
                            keyboardType="numeric"
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.addContentButton}
                          onPress={handleAddContent}
                          disabled={addContentMutation.isLoading}
                        >
                          {addContentMutation.isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="add" size={20} color="#fff" />
                              <Text style={styles.addContentButtonText}>Add Question</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    )}

                    {selectedGameType === 'word' && (
                      <>
                        <Text style={styles.sectionTitle}>Add Word</Text>
                        
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Word *</Text>
                          <TextInput
                            style={styles.input}
                            value={contentFormData.word}
                            onChangeText={(text) => setContentFormData({ ...contentFormData, word: text.toUpperCase() })}
                            placeholder="Enter word (e.g., HELLO)"
                            placeholderTextColor="#000"
                            autoCapitalize="characters"
                          />
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Hint (Optional)</Text>
                          <TextInput
                            style={[styles.input, styles.textArea]}
                            value={contentFormData.hint}
                            onChangeText={(text) => setContentFormData({ ...contentFormData, hint: text })}
                            placeholder="Enter hint for this word"
                            placeholderTextColor="#000"
                            multiline
                            numberOfLines={2}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.addContentButton}
                          onPress={handleAddContent}
                          disabled={addContentMutation.isLoading}
                        >
                          {addContentMutation.isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="add" size={20} color="#fff" />
                              <Text style={styles.addContentButtonText}>Add Word</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    )}

                    {selectedGameType === 'memory_match' && (
                      <>
                        <Text style={styles.sectionTitle}>Add Card Pair</Text>
                        
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Card 1 Text *</Text>
                          <TextInput
                            style={styles.input}
                            value={contentFormData.card1Text}
                            onChangeText={(text) => setContentFormData({ ...contentFormData, card1Text: text })}
                            placeholder="Enter text for card 1"
                            placeholderTextColor="#000"
                          />
                        </View>

                        <ImageUploadPicker
                          label="Card 1 Image (Optional)"
                          placeholder="Image URL or upload from device"
                          value={contentFormData.card1Image}
                          onChange={(url) => setContentFormData({ ...contentFormData, card1Image: url })}
                          folder="games"
                        />

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Card 2 Text *</Text>
                          <TextInput
                            style={styles.input}
                            value={contentFormData.card2Text}
                            onChangeText={(text) => setContentFormData({ ...contentFormData, card2Text: text })}
                            placeholder="Enter text for card 2 (matching pair)"
                            placeholderTextColor="#000"
                          />
                        </View>

                        <ImageUploadPicker
                          label="Card 2 Image (Optional)"
                          placeholder="Image URL or upload from device"
                          value={contentFormData.card2Image}
                          onChange={(url) => setContentFormData({ ...contentFormData, card2Image: url })}
                          folder="games"
                        />

                        <Text style={styles.hintText}>
                          Card 1 and Card 2 will be a matching pair in the game
                        </Text>

                        <TouchableOpacity
                          style={styles.addContentButton}
                          onPress={handleAddContent}
                          disabled={addContentMutation.isLoading}
                        >
                          {addContentMutation.isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="add" size={20} color="#fff" />
                              <Text style={styles.addContentButtonText}>Add Card Pair</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {/* Existing Content List */}
                  <View style={styles.contentListSection}>
                    <Text style={styles.sectionTitle}>
                      {selectedGameType === 'quiz' && `Questions (${gameContent?.length || 0})`}
                      {selectedGameType === 'word' && `Words (${gameContent?.length || 0})`}
                      {selectedGameType === 'memory_match' && `Card Pairs (${gameContent?.length || 0})`}
                    </Text>
                    {gameContent && gameContent.length > 0 ? (
                      gameContent.map((content, index) => {
                        if (selectedGameType === 'quiz') {
                          return (
                            <View key={content.id} style={styles.contentItem}>
                              <View style={styles.contentItemHeader}>
                                <Text style={styles.contentItemNumber}>Q{index + 1}</Text>
                                <TouchableOpacity
                                  style={styles.deleteContentButton}
                                  onPress={() => handleDeleteContent(content.id)}
                                >
                                  <Ionicons name="trash" size={18} color="#FF3B30" />
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.contentQuestion}>
                                {content.content_data?.question || 'No question'}
                              </Text>
                              <View style={styles.contentOptions}>
                                {content.content_data?.options?.map((opt: string, optIndex: number) => (
                                  <Text
                                    key={optIndex}
                                    style={[
                                      styles.contentOption,
                                      optIndex === content.content_data?.correctAnswer &&
                                        styles.contentOptionCorrect,
                                    ]}
                                  >
                                    {optIndex === content.content_data?.correctAnswer ? '✓ ' : '  '}
                                    {opt}
                                  </Text>
                                ))}
                              </View>
                              <Text style={styles.contentPoints}>
                                {content.content_data?.points || 10} points
                              </Text>
                            </View>
                          );
                        } else if (selectedGameType === 'word') {
                          return (
                            <View key={content.id} style={styles.contentItem}>
                              <View style={styles.contentItemHeader}>
                                <Text style={styles.contentItemNumber}>#{index + 1}</Text>
                                <TouchableOpacity
                                  style={styles.deleteContentButton}
                                  onPress={() => handleDeleteContent(content.id)}
                                >
                                  <Ionicons name="trash" size={18} color="#FF3B30" />
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.contentWord}>
                                {content.content_data?.word || 'No word'}
                              </Text>
                              {content.content_data?.hint && (
                                <Text style={styles.contentHint}>
                                  Hint: {content.content_data.hint}
                                </Text>
                              )}
                            </View>
                          );
                        } else if (selectedGameType === 'memory_match') {
                          return (
                            <View key={content.id} style={styles.contentItem}>
                              <View style={styles.contentItemHeader}>
                                <Text style={styles.contentItemNumber}>Pair {index + 1}</Text>
                                <TouchableOpacity
                                  style={styles.deleteContentButton}
                                  onPress={() => handleDeleteContent(content.id)}
                                >
                                  <Ionicons name="trash" size={18} color="#FF3B30" />
                                </TouchableOpacity>
                              </View>
                              <View style={styles.cardPairContainer}>
                                <View style={styles.cardItem}>
                                  <Text style={styles.cardLabel}>Card 1:</Text>
                                  <Text style={styles.cardText}>
                                    {content.content_data?.card1?.text || 'N/A'}
                                  </Text>
                                  {content.content_data?.card1?.image && (
                                    <Text style={styles.cardImageUrl} numberOfLines={1}>
                                      Image: {content.content_data.card1.image}
                                    </Text>
                                  )}
                                </View>
                                <Ionicons name="swap-horizontal" size={24} color="#007AFF" style={{ marginHorizontal: 10 }} />
                                <View style={styles.cardItem}>
                                  <Text style={styles.cardLabel}>Card 2:</Text>
                                  <Text style={styles.cardText}>
                                    {content.content_data?.card2?.text || 'N/A'}
                                  </Text>
                                  {content.content_data?.card2?.image && (
                                    <Text style={styles.cardImageUrl} numberOfLines={1}>
                                      Image: {content.content_data.card2.image}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                          );
                        }
                        return null;
                      })
                    ) : (
                      <View style={styles.emptyContentContainer}>
                        <Text style={styles.emptyContentText}>
                          {selectedGameType === 'quiz' && 'No questions added yet'}
                          {selectedGameType === 'word' && 'No words added yet'}
                          {selectedGameType === 'memory_match' && 'No card pairs added yet'}
                        </Text>
                        <Text style={styles.emptyContentSubtext}>
                          Add content using the form above
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  templateType: {
    fontSize: 12,
    color: '#999',
  },
  instanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instanceInfo: {
    flex: 1,
  },
  instanceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  instanceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  instanceType: {
    fontSize: 12,
    color: '#999',
  },
  instanceBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  instanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  instanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  instanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instanceStatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },
  instanceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconButton: {
    padding: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
    marginRight: 10,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  radioButtonActive: {
    backgroundColor: '#007AFF',
  },
  radioButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  radioButtonTextActive: {
    color: '#fff',
  },
  configNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
  configSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#34C759',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  selectGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  createButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  contentFormSection: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  contentListSection: {
    marginTop: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioChecked: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionInput: {
    flex: 1,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  addContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  addContentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  contentItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contentItemNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  deleteContentButton: {
    padding: 4,
  },
  contentQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contentOptions: {
    marginBottom: 10,
  },
  contentOption: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    paddingLeft: 8,
  },
  contentOptionCorrect: {
    color: '#34C759',
    fontWeight: '600',
  },
  contentPoints: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContentContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyContentText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  emptyContentSubtext: {
    fontSize: 12,
    color: '#ccc',
  },
  contentWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    letterSpacing: 2,
  },
  contentHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  cardPairContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  cardItem: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardImageUrl: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
});

