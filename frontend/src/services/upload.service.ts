/**
 * Upload service for handling file uploads to Cloudinary via backend
 */
import api from '../config/api';

export interface UploadResponse {
  message: string;
  url: string;
  publicId: string;
}

export interface DeleteResponse {
  message: string;
}

/**
 * Upload a file to Cloudinary
 * @param fileUri - Local file URI (from expo-image-picker)
 * @param folder - Folder name in Cloudinary (e.g., 'products', 'users', 'games')
 * @returns Upload response with secure URL
 */
export async function uploadFile(
  fileUri: string,
  folder: string = 'general'
): Promise<UploadResponse> {
  // Convert file URI to FormData
  const formData = new FormData();
  
  // Extract filename from URI
  const filename = fileUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  // Append file to FormData (React Native format)
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: type,
  } as any);
  
  formData.append('folder', folder);

  // Don't set Content-Type header - axios will set it automatically with boundary
  const response = await api.post<UploadResponse>('/upload', formData);

  return response.data;
}

/**
 * Delete a file from Cloudinary by public ID
 * @param publicId - Public ID of the file
 */
export async function deleteFile(publicId: string): Promise<DeleteResponse> {
  const response = await api.delete<DeleteResponse>(`/upload/${publicId}`);
  return response.data;
}

/**
 * Delete a file from Cloudinary by URL
 * @param url - Cloudinary URL of the file
 */
export async function deleteFileByUrl(url: string): Promise<DeleteResponse> {
  const response = await api.delete<DeleteResponse>('/upload/by-url', {
    data: { url },
  });
  return response.data;
}

