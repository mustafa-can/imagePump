'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/components/ui/Toast';

// Quality settings for client-side compression
const QUALITY_SETTINGS = {
  low: { quality: 0.6, maxDimension: 1024 },
  medium: { quality: 0.8, maxDimension: 2048 },
  high: { quality: 0.92, maxDimension: 4096 },
};

// Client-side image compression using Canvas API
async function compressImageClientSide(
  file: File,
  quality: 'low' | 'medium' | 'high'
): Promise<Blob> {
  const settings = QUALITY_SETTINGS[quality];

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > settings.maxDimension || height > settings.maxDimension) {
        if (width > height) {
          height = (height / width) * settings.maxDimension;
          width = settings.maxDimension;
        } else {
          width = (width / height) * settings.maxDimension;
          height = settings.maxDimension;
        }
      }

      // Create canvas and compress
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Compression failed'));
          }
        },
        'image/webp',
        settings.quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function useCompression() {
  const {
    compression,
    images,
    updateImageStatus,
    updateImageProgress,
    startProcessing,
    stopProcessing,
    setCurrentProcessingId,
    isProcessing,
  } = useAppStore();
  const [isCompressing, setIsCompressing] = useState(false);

  const compressBlob = useCallback(
    async (blob: Blob): Promise<Blob> => {
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('quality', compression.quality);

      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Compression failed');
      }

      return response.blob();
    },
    [compression.quality]
  );

  const compressMultiple = useCallback(
    async (blobs: Blob[]): Promise<Blob[]> => {
      if (!compression.enabled) {
        return blobs;
      }

      setIsCompressing(true);

      try {
        const results = await Promise.all(
          blobs.map((blob) => compressBlob(blob))
        );
        return results;
      } finally {
        setIsCompressing(false);
      }
    },
    [compression.enabled, compressBlob]
  );

  // Compress-only mode: compress all pending images CLIENT-SIDE (no server needed)
  const compressAll = useCallback(async () => {
    const pendingImages = images.filter((img) => img.status === 'pending');

    if (pendingImages.length === 0) {
      toast.error('No images to compress');
      return;
    }

    startProcessing();
    let successCount = 0;
    let failCount = 0;
    let totalSaved = 0;

    for (const image of pendingImages) {
      setCurrentProcessingId(image.id);
      updateImageStatus(image.id, 'processing');
      updateImageProgress(image.id, 10);

      try {
        updateImageProgress(image.id, 30);

        // Use client-side compression (no server call needed)
        const originalSize = image.file.size;
        const compressedBlob = await compressImageClientSide(image.file, compression.quality);

        updateImageProgress(image.id, 90);

        const compressedSize = compressedBlob.size;
        totalSaved += originalSize - compressedSize;

        updateImageProgress(image.id, 100);
        updateImageStatus(image.id, 'completed', compressedBlob);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Compression failed';
        updateImageStatus(image.id, 'failed', undefined, errorMessage);
        failCount++;
      }
    }

    stopProcessing();

    if (successCount > 0) {
      const savedMB = (totalSaved / (1024 * 1024)).toFixed(1);
      toast.success(`Compressed ${successCount} image(s) - Saved ${savedMB}MB`);
    }
    if (failCount > 0) {
      toast.error(`Failed to compress ${failCount} image(s)`);
    }
  }, [images, compression.quality, startProcessing, stopProcessing, setCurrentProcessingId, updateImageStatus, updateImageProgress]);

  const pendingCount = images.filter((img) => img.status === 'pending').length;

  return {
    compressBlob,
    compressMultiple,
    compressAll,
    isCompressing: isCompressing || isProcessing,
    isEnabled: compression.enabled,
    quality: compression.quality,
    canCompress: !isProcessing && pendingCount > 0,
    pendingCount,
  };
}
