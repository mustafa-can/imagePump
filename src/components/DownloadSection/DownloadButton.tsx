'use client';

import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui';
import { useDownload } from '@/hooks/useDownload';

export default function DownloadButton() {
  const { isProcessing } = useAppStore();
  const {
    downloadAll,
    isGenerating,
    progress,
    completedCount,
    selectedCount,
    canDownload,
  } = useDownload();

  if (!canDownload) {
    return null;
  }

  // Determine button text based on state
  const getButtonText = () => {
    if (isGenerating) {
      if (progress.totalBatches > 1) {
        return `Downloading ${progress.currentBatch}/${progress.totalBatches}...`;
      }
      return 'Generating ZIP...';
    }

    if (selectedCount > 0) {
      return `Download Selected (${selectedCount})`;
    }

    return `Download All (${completedCount})`;
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={downloadAll}
        isLoading={isGenerating}
        disabled={isProcessing || isGenerating}
        size="lg"
        className="w-full"
      >
        {getButtonText()}
      </Button>
      {selectedCount === 0 && completedCount > 0 && (
        <p className="text-xs text-muted text-center">
          Select specific images or download all
        </p>
      )}
    </div>
  );
}
