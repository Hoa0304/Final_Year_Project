/**
 * Upload controller for handling file uploads to Cloudinary
 */
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  isValidFileType,
  isValidFileSize,
  extractPublicIdFromUrl,
} from '../utils/cloudinary';

/**
 * Upload a file to Cloudinary
 * POST /api/upload
 * Requires authentication
 */
export async function uploadFile(req: AuthRequest, res: Response) {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const folder = (req.body.folder as string) || 'general';
    const userId = req.user!.userId;

    // Validate file type
    if (!isValidFileType(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP, SVG) are allowed.',
      });
    }

    // Validate file size
    if (!isValidFileSize(file.size)) {
      return res.status(400).json({
        error: 'File size exceeds 10MB limit.',
      });
    }

    // Generate public ID with user ID prefix for organization
    const publicId = `${folder}/${userId}_${Date.now()}`;

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      folder,
      publicId
    );

    res.json({
      message: 'File uploaded successfully',
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload file',
    });
  }
}

/**
 * Delete a file from Cloudinary
 * DELETE /api/upload/:publicId
 * Requires authentication
 */
export async function deleteFile(req: AuthRequest, res: Response) {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(publicId);

    res.json({
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete file',
    });
  }
}

/**
 * Delete file by URL (extracts public ID from URL)
 * DELETE /api/upload/by-url
 * Requires authentication
 */
export async function deleteFileByUrl(req: AuthRequest, res: Response) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Extract public ID from URL
    const publicId = extractPublicIdFromUrl(url);

    if (!publicId) {
      return res.status(400).json({ error: 'Invalid Cloudinary URL' });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(publicId);

    res.json({
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete by URL error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete file',
    });
  }
}






















