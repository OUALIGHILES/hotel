'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  label: string;
  description?: string;
  onMainImageChange?: (file: File) => void;
  onAdditionalImagesChange?: (files: File[]) => void;
  mainImagePreview?: string;
  additionalImagePreviews?: string[];
  maxAdditionalImages?: number;
  className?: string;
}

// Helper function to determine correct MIME type based on file extension
const getCorrectMimeType = (extension: string | undefined): string | null => {
  if (!extension) return null;

  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'tiff': 'image/tiff',
    'ico': 'image/x-icon',
    'apng': 'image/apng',
    'avif': 'image/avif'
  };

  return mimeTypes[extension.toLowerCase()] || null;
};

export function ImageUpload({
  label,
  description,
  onMainImageChange,
  onAdditionalImagesChange,
  mainImagePreview,
  additionalImagePreviews = [],
  maxAdditionalImages = 10,
  className
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  
  const handleMainImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Validate file type and handle potential JSON MIME type issue
      if (!file.type || file.type === 'application/json' || !file.type.startsWith('image/')) {
        // Try to determine the correct MIME type from the file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const correctMimeType = getCorrectMimeType(fileExtension);

        if (correctMimeType) {
          // Create a new file with the correct MIME type if it's a known image format
          const correctedFile = new File([file], file.name, {
            type: correctMimeType,
            lastModified: file.lastModified
          });

          // Additional validation to ensure it's a real image file
          const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];
          if (fileExtension && !validImageExtensions.includes(fileExtension)) {
            console.warn('File extension not supported for main picture upload');
            alert('Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) for the main picture.');
            return;
          }

          setMainImageFile(correctedFile);
          onMainImageChange?.(correctedFile);
        } else {
          console.warn('Only image files are allowed for main picture upload');
          alert('Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) for the main picture.');
          return;
        }
      } else {
        // Additional validation to ensure it's a real image file
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];

        if (fileExtension && !validImageExtensions.includes(fileExtension)) {
          console.warn('File extension not supported for main picture upload');
          alert('Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) for the main picture.');
          return;
        }

        setMainImageFile(file);
        onMainImageChange?.(file);
      }
    }
  }, [onMainImageChange]);

  const handleAdditionalImagesDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files) {
      const newFiles: File[] = [];
      const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];

      Array.from(e.dataTransfer.files).forEach(file => {
        // Validate file type and handle potential JSON MIME type issue
        if (!file.type || file.type === 'application/json' || !file.type.startsWith('image/')) {
          // Try to determine the correct MIME type from the file extension
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          const correctMimeType = getCorrectMimeType(fileExtension);

          if (correctMimeType) {
            // Create a new file with the correct MIME type if it's a known image format
            const correctedFile = new File([file], file.name, {
              type: correctMimeType,
              lastModified: file.lastModified
            });

            if (fileExtension && validImageExtensions.includes(fileExtension)) {
              if (additionalFiles.length + newFiles.length < maxAdditionalImages) {
                newFiles.push(correctedFile);
              }
            } else {
              console.warn(`File ${file.name} has an unsupported extension and will be skipped`);
              return;
            }
          } else {
            console.warn(`File ${file.name} is not an image and will be skipped`);
            return;
          }
        } else {
          // Additional validation to ensure it's a real image file
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          if (fileExtension && !validImageExtensions.includes(fileExtension)) {
            console.warn(`File ${file.name} has an unsupported extension and will be skipped`);
            return;
          }

          if (additionalFiles.length + newFiles.length < maxAdditionalImages) {
            newFiles.push(file);
          }
        }
      });

      if (newFiles.length > 0) {
        const updatedFiles = [...additionalFiles, ...newFiles];
        setAdditionalFiles(updatedFiles);
        onAdditionalImagesChange?.(updatedFiles);
      } else if (e.dataTransfer.files.length > 0) {
        alert('Only image files (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) are allowed for additional pictures. Non-image files have been skipped.');
      }
    }
  }, [additionalFiles, maxAdditionalImages, onAdditionalImagesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleMainImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type and handle potential JSON MIME type issue
      if (!file.type || file.type === 'application/json' || !file.type.startsWith('image/')) {
        // Try to determine the correct MIME type from the file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const correctMimeType = getCorrectMimeType(fileExtension);

        if (correctMimeType) {
          // Create a new file with the correct MIME type if it's a known image format
          const correctedFile = new File([file], file.name, {
            type: correctMimeType,
            lastModified: file.lastModified
          });

          // Additional validation to ensure it's a real image file
          const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];
          if (fileExtension && !validImageExtensions.includes(fileExtension)) {
            console.warn('File extension not supported for main picture upload');
            alert('Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) for the main picture.');
            return;
          }

          setMainImageFile(correctedFile);
          onMainImageChange?.(correctedFile);
        } else {
          console.warn('Only image files are allowed for main picture upload');
          // Optionally, you can show an error notification to the user
          alert('Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) for the main picture.');
          return;
        }
      } else {
        // Additional validation to ensure it's a real image file
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];

        if (fileExtension && !validImageExtensions.includes(fileExtension)) {
          console.warn('File extension not supported for main picture upload');
          alert('Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) for the main picture.');
          return;
        }

        setMainImageFile(file);
        onMainImageChange?.(file);
      }
    }
  };

  const handleAdditionalImagesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: File[] = [];
      const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'apng', 'avif'];

      Array.from(e.target.files).forEach(file => {
        // Validate file type and handle potential JSON MIME type issue
        if (!file.type || file.type === 'application/json' || !file.type.startsWith('image/')) {
          // Try to determine the correct MIME type from the file extension
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          const correctMimeType = getCorrectMimeType(fileExtension);

          if (correctMimeType) {
            // Create a new file with the correct MIME type if it's a known image format
            const correctedFile = new File([file], file.name, {
              type: correctMimeType,
              lastModified: file.lastModified
            });

            if (fileExtension && validImageExtensions.includes(fileExtension)) {
              if (additionalFiles.length + newFiles.length < maxAdditionalImages) {
                newFiles.push(correctedFile);
              }
            } else {
              console.warn(`File ${file.name} has an unsupported extension and will be skipped`);
              return;
            }
          } else {
            console.warn(`File ${file.name} is not an image and will be skipped`);
            return;
          }
        } else {
          // Additional validation to ensure it's a real image file
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          if (fileExtension && !validImageExtensions.includes(fileExtension)) {
            console.warn(`File ${file.name} has an unsupported extension and will be skipped`);
            return;
          }

          if (additionalFiles.length + newFiles.length < maxAdditionalImages) {
            newFiles.push(file);
          }
        }
      });

      if (newFiles.length > 0) {
        const updatedFiles = [...additionalFiles, ...newFiles];
        setAdditionalFiles(updatedFiles);
        onAdditionalImagesChange?.(updatedFiles);
      } else if (e.target.files.length > 0) {
        alert('Only image files (JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, APNG, AVIF) are allowed for additional pictures. Non-image files have been skipped.');
      }
    }
  };

  const removeAdditionalImage = (index: number) => {
    const updatedFiles = additionalFiles.filter((_, i) => i !== index);
    setAdditionalFiles(updatedFiles);
    onAdditionalImagesChange?.(updatedFiles);
  };

  const removeAdditionalPreview = (index: number) => {
    // This function would be used to remove existing images during editing
    // For now, we're only removing newly added files
  };

  // Need to create object URLs only when needed to avoid issues during SSR
  const getObjectUrl = (file: File) => {
    if (typeof window !== 'undefined') {
      return URL.createObjectURL(file);
    }
    return '';
  };

  // Create object URLs for additional files using a ref to track them
  const additionalFileUrls = useRef<{[key: number]: string}>({});

  // Create new URLs when additionalFiles change
  useEffect(() => {
    // Revoke old URLs
    Object.values(additionalFileUrls.current).forEach(url => URL.revokeObjectURL(url));

    // Create new URLs
    additionalFileUrls.current = {};
    additionalFiles.forEach((file, index) => {
      if (file) {
        additionalFileUrls.current[index] = URL.createObjectURL(file);
      }
    });

    // Cleanup on unmount
    return () => {
      Object.values(additionalFileUrls.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, [additionalFiles]);

  // Create object URL for main image file
  const mainImageUrl = useRef<string | null>(null);

  // Create new URL when mainImageFile changes
  useEffect(() => {
    // Revoke old URL if exists
    if (mainImageUrl.current) {
      URL.revokeObjectURL(mainImageUrl.current);
    }

    // Create new URL if there's a main image file
    if (mainImageFile) {
      mainImageUrl.current = URL.createObjectURL(mainImageFile);
    } else {
      mainImageUrl.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (mainImageUrl.current) {
        URL.revokeObjectURL(mainImageUrl.current);
      }
    };
  }, [mainImageFile]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}

        {/* Main Image Upload */}
        <div
          className={cn(
            'relative w-full aspect-video rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden',
            dragActive ? 'border-primary bg-primary/10' : 'border-border'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleMainImageDrop}
        >
          {/* Main Image Upload Area */}
          <div
            className={cn(
              'relative w-full aspect-video rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden cursor-pointer',
              dragActive && !mainImagePreview ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            )}
            onClick={() => document.getElementById('main-image-upload')?.click()}
          >
            {mainImageFile ? (
              <div className="relative w-full h-full">
                {mainImageUrl.current && (
                  <Image
                    src={mainImageUrl.current}
                    alt="Main unit preview"
                    fill
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : mainImagePreview ? (
              <div className="relative w-full h-full">
                <Image
                  src={mainImagePreview}
                  alt="Main unit preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop your main unit image here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
            )}
          </div>

          <input
            id="main-image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleMainImageInput}
          />
        </div>
      </div>

      {/* Additional Images Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Additional Pictures</label>
        <div
          className={cn(
            'w-full rounded-lg border-2 border-dashed bg-muted min-h-[120px] p-4',
            dragActive ? 'border-primary bg-primary/10' : 'border-border'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleAdditionalImagesDrop}
        >
          <div
            onClick={() => document.getElementById('additional-images-upload')?.click()}
            className="cursor-pointer"
          >
            {additionalFiles.length > 0 || additionalImagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {additionalFiles.map((file, fileIndex) => (
                  <div key={`file-${fileIndex}`} className="relative group aspect-square rounded-lg overflow-hidden border">
                    <div className="relative w-full h-full">
                      {additionalFileUrls.current[fileIndex] && (
                        <Image
                          src={additionalFileUrls.current[fileIndex]}
                          alt={`Additional image ${fileIndex + 1}`}
                          fill
                          className="object-cover"
                        />
                      )}
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the parent click handler
                          removeAdditionalImage(fileIndex);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {additionalImagePreviews.map((preview, previewIndex) => (
                  <div key={`preview-${previewIndex}`} className="relative group aspect-square rounded-lg overflow-hidden border">
                    <div className="relative w-full h-full">
                      <Image
                        src={preview}
                        alt={`Additional image preview ${previewIndex + 1}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                          Existing
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {additionalFiles.length + additionalImagePreviews.length < maxAdditionalImages && (
                  <div className="relative aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                    <div className="text-center p-2">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Add more
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop additional images here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse (up to {maxAdditionalImages} images)
                </p>
              </div>
            )}
          </div>

          <input
            id="additional-images-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAdditionalImagesInput}
          />
        </div>
      </div>
    </div>
  );
}