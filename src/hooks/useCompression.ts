'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/components/ui/Toast';

export function useCompression() {
  const { compression } = useAppStore();
  const [isCompressing, setIsCompressing] = useState(false);

  const compressBlob = useCallback(
    async (blob: Blob): Promise<Blob> => {
      if (!compression.enabled) {
        return blob;
      }

      setIsCompressing(true);

      try {
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

        const compressedBlob = await response.blob();

        const originalSize = blob.size;
        const compressedSize = compressedBlob.size;
        const savingsPercent = ((originalSize - compressedSize) / originalSize * 100).toFixed(0);

        console.log(`Compressed: ${originalSize} -> ${compressedSize} (${savingsPercent}% savings)`);

        return compressedBlob;
      } catch (error) {
        console.error('Compression error:', error);
        toast.error('Compression failed, using original image');
        return blob;
      } finally {
        setIsCompressing(false);
      }
    },
    [compression]
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
    [compression, compressBlob]
  );

  return {
    compressBlob,
    compressMultiple,
    isCompressing,
    isEnabled: compression.enabled,
    quality: compression.quality,
  };
}
