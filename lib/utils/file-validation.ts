/**
 * Utility functions for file validation and MIME type handling
 */

// Define supported image MIME types
export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/tiff',
  'image/x-icon',
  'image/apng',
  'image/avif'
];

// Define supported image file extensions
export const SUPPORTED_IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'
];

/**
 * Validates if a file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  // Check if it's a File object
  if (!(file instanceof File)) {
    return false;
  }

  // Check size (max 10MB)
  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    return false;
  }

  // Check MIME type
  if (file.type && SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
    return true;
  }

  // Fallback: check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension && SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension)) {
    return true;
  }

  return false;
}

/**
 * Attempts to correct/validate the file's MIME type based on file extension
 * This helps fix cases where browsers incorrectly detect MIME types
 */
export function correctImageMimeType(file: File): File {
  if (!(file instanceof File)) {
    throw new Error('Input is not a File object');
  }

  // If the file already has a proper image MIME type, return as is
  if (file.type && SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
    return file;
  }

  // If the MIME type is JSON or some other incorrect type, try to determine from extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension) {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'ico': 'image/x-icon',
      'apng': 'image/apng',
      'avif': 'image/avif'
    };

    const correctedMimeType = mimeTypes[fileExtension] || 'image/jpeg';

    // Create a new file with the corrected MIME type
    return new File([file], file.name, {
      type: correctedMimeType,
      lastModified: file.lastModified
    });
  }

  // If we can't determine the extension, default to jpeg
  return new File([file], file.name, {
    type: 'image/jpeg',
    lastModified: file.lastModified
  });
}

/**
 * Validates and corrects a file for upload, providing user feedback if needed
 */
export async function validateAndCorrectImageFile(file: File, fieldName: string = 'file'): Promise<{ file: File, error?: string }> {
  // Basic validation
  if (!(file instanceof File)) {
    return { file, error: `${fieldName} is not a valid file object.` };
  }

  if (file.size === 0) {
    return { file, error: `${fieldName} is empty and cannot be uploaded.` };
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return { file, error: `${fieldName} is too large. Maximum size is 10MB.` };
  }

  // Check if it's an image file
  if (!isValidImageFile(file)) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && !SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension)) {
      return { file, error: `${fieldName} has an unsupported file extension (.${fileExtension}). Supported formats: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}` };
    }
  }

  // Correct the MIME type
  const correctedFile = correctImageMimeType(file);

  // Final check after correction
  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(correctedFile.type)) {
    return { file: correctedFile, error: `${fieldName} has an unsupported MIME type (${correctedFile.type}).` };
  }

  return { file: correctedFile, error: undefined };
}