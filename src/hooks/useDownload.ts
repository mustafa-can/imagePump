'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { blobToBase64 } from '@/lib/image-utils';
import { toast } from '@/components/ui/Toast';

export function useDownload() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { images } = useAppStore();

  const completedImages = images.filter(
    (img) => img.status === 'completed' && img.result
  );

  const downloadAll = useCallback(async () => {
    if (completedImages.length === 0) {
      toast.error('No completed images to download');
      return;
    }

    setIsGenerating(true);

    try {
      // Convert blobs to base64
      const imageData = await Promise.all(
        completedImages.map(async (img, index) => {
          const base64 = await blobToBase64(img.result!);
          const originalName = img.file.name.replace(/\.[^/.]+$/, '');
          return {
            filename: `edited-${index + 1}-${originalName}.png`,
            base64,
          };
        })
      );

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imageData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Download generation failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imagepump-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate download');
    } finally {
      setIsGenerating(false);
    }
  }, [completedImages]);

  const downloadSingle = useCallback(async (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image?.result) {
      toast.error('Image not found or not ready');
      return;
    }

    const url = URL.createObjectURL(image.result);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited-${image.file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [images]);

  return {
    downloadAll,
    downloadSingle,
    isGenerating,
    completedCount: completedImages.length,
    canDownload: completedImages.length > 0,
  };
}
