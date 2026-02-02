'use client';

import { useAppStore } from '@/store/useAppStore';
import { ProgressBar } from '@/components/ui';

export default function ProcessingStatus() {
  const { images, isProcessing } = useAppStore();

  if (images.length === 0) {
    return null;
  }

  const completed = images.filter((img) => img.status === 'completed').length;
  const failed = images.filter((img) => img.status === 'failed').length;
  const total = images.length;
  const progress = ((completed + failed) / total) * 100;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {isProcessing ? 'Processing...' : 'Processing Complete'}
        </span>
        <span className="text-sm text-gray-500">
          {completed + failed} / {total}
        </span>
      </div>
      <ProgressBar
        progress={progress}
        color={failed > 0 ? 'yellow' : 'green'}
        size="md"
      />
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {completed} completed
        </span>
        {failed > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {failed} failed
          </span>
        )}
        {isProcessing && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Processing
          </span>
        )}
      </div>
    </div>
  );
}
