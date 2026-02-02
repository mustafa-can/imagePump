'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { blobToBase64 } from '@/lib/image-utils';

export default function DownloadButton() {
  const { images, isProcessing } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const completedImages = images.filter(
    (img) => img.status === 'completed' && img.result
  );

  const handleDownload = async () => {
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
          return {
            filename: `edited-${index + 1}-${img.file.name.replace(/\.[^/.]+$/, '')}.png`,
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
        throw new Error('Download generation failed');
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
      toast.error('Failed to generate download');
    } finally {
      setIsGenerating(false);
    }
  };

  if (completedImages.length === 0) {
    return null;
  }

  return (
    <Button
      onClick={handleDownload}
      isLoading={isGenerating}
      disabled={isProcessing || isGenerating}
      size="lg"
      className="w-full"
    >
      {isGenerating
        ? 'Generating ZIP...'
        : `Download All (${completedImages.length} images)`}
    </Button>
  );
}
