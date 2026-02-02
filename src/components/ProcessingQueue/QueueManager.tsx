'use client';

import { useAppStore } from '@/store/useAppStore';
import QueueItem from './QueueItem';
import ProcessingStatus from './ProcessingStatus';

export default function QueueManager() {
  const { images, isProcessing } = useAppStore();

  if (images.length === 0) {
    return null;
  }

  const pendingImages = images.filter((img) => img.status === 'pending');
  const processingImages = images.filter((img) => img.status === 'processing');
  const completedImages = images.filter((img) => img.status === 'completed');
  const failedImages = images.filter((img) => img.status === 'failed');

  return (
    <div className="space-y-4">
      <ProcessingStatus />

      {isProcessing && processingImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Currently Processing</h4>
          <div className="space-y-2">
            {processingImages.map((image) => (
              <QueueItem key={image.id} image={image} />
            ))}
          </div>
        </div>
      )}

      {pendingImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Pending ({pendingImages.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {pendingImages.map((image) => (
              <QueueItem key={image.id} image={image} />
            ))}
          </div>
        </div>
      )}

      {completedImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Completed ({completedImages.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {completedImages.map((image) => (
              <QueueItem key={image.id} image={image} />
            ))}
          </div>
        </div>
      )}

      {failedImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-600 mb-2">
            Failed ({failedImages.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {failedImages.map((image) => (
              <QueueItem key={image.id} image={image} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
