'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { validateImageFile, preCompressImage } from '@/lib/image-utils';
import { toast } from '@/components/ui/Toast';

interface UseImageUploadOptions {
  maxFiles?: number;
  preCompress?: boolean;
  maxFileSize?: number;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { maxFiles = 50, preCompress = false, maxFileSize = 5 * 1024 * 1024 } = options;
  const { addImages, images, isProcessing } = useAppStore();

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (isProcessing) {
        toast.error('Cannot upload while processing');
        return;
      }

      // Check max files limit
      const remainingSlots = maxFiles - images.length;
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${maxFiles} images allowed`);
        return;
      }

      const filesToProcess = files.slice(0, remainingSlots);
      if (filesToProcess.length < files.length) {
        toast.warning(`Only ${filesToProcess.length} images added due to limit`);
      }

      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of filesToProcess) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`);
          continue;
        }

        let processedFile = file;
        if (preCompress && file.size > maxFileSize) {
          try {
            processedFile = await preCompressImage(file, maxFileSize);
          } catch {
            errors.push(`${file.name}: Failed to compress`);
            continue;
          }
        }

        validFiles.push(processedFile);
      }

      if (validFiles.length > 0) {
        addImages(validFiles);
        toast.success(`Added ${validFiles.length} image(s)`);
      }

      if (errors.length > 0) {
        errors.slice(0, 3).forEach((error) => toast.error(error));
        if (errors.length > 3) {
          toast.error(`...and ${errors.length - 3} more errors`);
        }
      }
    },
    [addImages, images.length, isProcessing, maxFiles, preCompress, maxFileSize]
  );

  return {
    uploadFiles,
    canUpload: !isProcessing && images.length < maxFiles,
    remainingSlots: maxFiles - images.length,
  };
}
