'use client';

import { useAppStore } from '@/store/useAppStore';
import { ProgressBar } from '@/components/ui';

export default function UploadStatus() {
  const { images, isProcessing } = useAppStore();

  if (images.length === 0) {
    return null;
  }

  const pending = images.filter((img) => img.status === 'pending').length;
  const processing = images.filter((img) => img.status === 'processing').length;
  const completed = images.filter((img) => img.status === 'completed').length;
  const failed = images.filter((img) => img.status === 'failed').length;

  const progress = images.length > 0 ? (completed / images.length) * 100 : 0;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Processing Status</span>
        <span className="text-sm text-gray-500">
          {completed} / {images.length} completed
        </span>
      </div>
      {isProcessing && (
        <ProgressBar progress={progress} showLabel size="md" color="blue" />
      )}
      <div className="flex gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          Pending: {pending}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Processing: {processing}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Completed: {completed}
        </span>
        {failed > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Failed: {failed}
          </span>
        )}
      </div>
    </div>
  );
}
