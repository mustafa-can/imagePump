'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/components/ui/Toast';

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

  // Compress-only mode: compress all pending images without AI processing
  const compressAll = useCallback(async () => {
    const pendingImages = images.filter((img) => img.status === 'pending');

    if (pendingImages.length === 0) {
      toast.error('No images to compress');
      return;
    }

    startProcessing();
    let successCount = 0;
    let failCount = 0;

    for (const image of pendingImages) {
      setCurrentProcessingId(image.id);
      updateImageStatus(image.id, 'processing');
      updateImageProgress(image.id, 10);

      try {
        updateImageProgress(image.id, 30);

        const formData = new FormData();
        formData.append('image', image.file);
        formData.append('quality', compression.quality);

        const response = await fetch('/api/compress', {
          method: 'POST',
          body: formData,
        });

        updateImageProgress(image.id, 70);

        if (!response.ok) {
          throw new Error('Compression failed');
        }

        const compressedBlob = await response.blob();
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
      toast.success(`Compressed ${successCount} image(s)`);
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
