'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { blobToBase64 } from '@/lib/image-utils';
import { toast } from '@/components/ui/Toast';

// Max batch size in bytes (~3MB to stay safely under Vercel's 4.5MB limit)
const MAX_BATCH_SIZE = 3 * 1024 * 1024;

interface ImageDataItem {
  id: string;
  filename: string;
  base64: string;
  size: number;
}

interface DownloadProgress {
  currentBatch: number;
  totalBatches: number;
  isDownloading: boolean;
}

export function useDownload() {
  const [progress, setProgress] = useState<DownloadProgress>({
    currentBatch: 0,
    totalBatches: 0,
    isDownloading: false,
  });
  const { images, deselectAll } = useAppStore();

  const completedImages = images.filter(
    (img) => img.status === 'completed' && img.result
  );

  const selectedImages = completedImages.filter((img) => img.selected);

  // Get images to download (selected or all if none selected)
  const getImagesToDownload = useCallback(() => {
    return selectedImages.length > 0 ? selectedImages : completedImages;
  }, [selectedImages, completedImages]);

  // Convert images to base64 and calculate sizes
  const prepareImageData = useCallback(async (imagesToProcess: typeof completedImages): Promise<ImageDataItem[]> => {
    return Promise.all(
      imagesToProcess.map(async (img, index) => {
        const base64 = await blobToBase64(img.result!);
        const originalName = img.file.name.replace(/\.[^/.]+$/, '');
        return {
          id: img.id,
          filename: `edited-${index + 1}-${originalName}.png`,
          base64,
          size: base64.length, // Base64 string length approximates byte size
        };
      })
    );
  }, []);

  // Split images into batches based on size
  const createBatches = useCallback((imageData: ImageDataItem[]): ImageDataItem[][] => {
    const batches: ImageDataItem[][] = [];
    let currentBatch: ImageDataItem[] = [];
    let currentBatchSize = 0;

    for (const img of imageData) {
      // If single image exceeds max size, put it in its own batch
      if (img.size > MAX_BATCH_SIZE) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchSize = 0;
        }
        batches.push([img]);
        continue;
      }

      // If adding this image would exceed the limit, start a new batch
      if (currentBatchSize + img.size > MAX_BATCH_SIZE && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }

      currentBatch.push(img);
      currentBatchSize += img.size;
    }

    // Don't forget the last batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }, []);

  // Download a single batch
  const downloadBatch = useCallback(async (
    batch: ImageDataItem[],
    batchNumber: number,
    totalBatches: number
  ): Promise<boolean> => {
    try {
      const payload = {
        images: batch.map(({ filename, base64 }) => ({ filename, base64 })),
      };

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Batch too large - try selecting fewer images');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Download failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Name the file based on batch number if multiple batches
      const filename = totalBatches > 1
        ? `imagepump-part${batchNumber}-of-${totalBatches}-${Date.now()}.zip`
        : `imagepump-${Date.now()}.zip`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error(`Batch ${batchNumber} download failed:`, error);
      throw error;
    }
  }, []);

  // Main download function with queue processing
  const downloadAll = useCallback(async () => {
    const imagesToDownload = getImagesToDownload();

    if (imagesToDownload.length === 0) {
      toast.error('No images to download');
      return;
    }

    setProgress({ currentBatch: 0, totalBatches: 0, isDownloading: true });

    try {
      // Prepare all image data
      toast.info(`Preparing ${imagesToDownload.length} images...`);
      const imageData = await prepareImageData(imagesToDownload);

      // Create batches
      const batches = createBatches(imageData);
      const totalBatches = batches.length;

      setProgress({ currentBatch: 0, totalBatches, isDownloading: true });

      if (totalBatches > 1) {
        toast.info(`Split into ${totalBatches} ZIP files due to size limits`);
      }

      // Download each batch sequentially
      for (let i = 0; i < batches.length; i++) {
        setProgress({ currentBatch: i + 1, totalBatches, isDownloading: true });

        await downloadBatch(batches[i], i + 1, totalBatches);

        // Small delay between downloads to prevent browser issues
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success(
        totalBatches > 1
          ? `Downloaded ${totalBatches} ZIP files`
          : 'Download complete'
      );

      // Clear selection after successful download
      deselectAll();
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download');
    } finally {
      setProgress({ currentBatch: 0, totalBatches: 0, isDownloading: false });
    }
  }, [getImagesToDownload, prepareImageData, createBatches, downloadBatch, deselectAll]);

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
    isGenerating: progress.isDownloading,
    progress,
    completedCount: completedImages.length,
    selectedCount: selectedImages.length,
    canDownload: completedImages.length > 0,
  };
}
