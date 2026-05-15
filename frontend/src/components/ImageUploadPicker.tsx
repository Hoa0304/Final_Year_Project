/**
 * ImageUploadPicker Component
 * Allows users to either upload an image from device or enter a URL
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../services/upload.service';
import { useMutation } from '@tanstack/react-query';

interface ImageUploadPickerProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  folder?: string; // Cloudinary folder (e.g., 'products', 'games')
  style?: any;
  inputStyle?: any;
}

export default function ImageUploadPicker({
  value,
  onChange,
  label = 'Image',
  placeholder = 'Image URL or upload from device',
  folder = 'general',
  style,
  inputStyle,
}: ImageUploadPickerProps) {
  const [imageUrl, setImageUrl] = useState(value || '');
  const [showOptions, setShowOptions] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(value || null);

  // Sync with prop value changes
  useEffect(() => {
    if (value !== imageUrl) {
      setImageUrl(value || '');
      setPreviewUri(value || null);
    }
  }, [value]);

  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      return await uploadFile(uri, folder);
    },
    onSuccess: (data) => {
      const uploadedUrl = data.url;
      setImageUrl(uploadedUrl);
      onChange(uploadedUrl);
      setPreviewUri(uploadedUrl);
      setShowOptions(false);
      Alert.alert('Success', 'Image uploaded successfully!');
    },
    onError: (error: any) => {
      Alert.alert(
        'Upload Failed',
        error.response?.data?.error || 'Failed to upload image. Please try again.'
      );
    },
  });

  /**
   * Request camera/library permissions
   */
  async function requestPermissions() {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are required to upload images.'
      );
      return false;
    }
    return true;
  }

  /**
   * Pick image from camera
   */
  async function pickFromCamera() {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPreviewUri(uri);
        uploadMutation.mutate(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera');
    }
  }

  /**
   * Pick image from gallery
   */
  async function pickFromGallery() {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPreviewUri(uri);
        uploadMutation.mutate(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery');
    }
  }

  /**
   * Handle URL input change
   */
  function handleUrlChange(text: string) {
    setImageUrl(text);
    onChange(text);
    if (text) {
      setPreviewUri(text);
    }
  }

  /**
   * Clear image
   */
  function handleClear() {
    setImageUrl('');
    onChange('');
    setPreviewUri(null);
  }

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Image Preview */}
      {previewUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}

      {/* URL Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#000"
          value={imageUrl}
          onChangeText={handleUrlChange}
          autoCapitalize="none"
          keyboardType="url"
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setShowOptions(true)}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Upload Options Modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Image</Text>
              <TouchableOpacity onPress={() => setShowOptions(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={pickFromGallery}
              disabled={uploadMutation.isPending}
            >
              <Ionicons name="images-outline" size={24} color="#007AFF" />
              <Text style={styles.optionButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={pickFromCamera}
              disabled={uploadMutation.isPending}
            >
              <Ionicons name="camera-outline" size={24} color="#007AFF" />
              <Text style={styles.optionButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.cancelButton]}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  optionButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
});

