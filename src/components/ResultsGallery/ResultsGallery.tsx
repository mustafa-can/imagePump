'use client';

import { useAppStore } from '@/store/useAppStore';
import ImageCard from './ImageCard';

export default function ResultsGallery() {
  const { images, selectAllCompleted, deselectAll } = useAppStore();

  const completedImages = images.filter((img) => img.status === 'completed' && img.result);
  const selectedCount = completedImages.filter((img) => img.selected).length;

  if (completedImages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-primary">
          Results ({completedImages.length})
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-secondary">
            {selectedCount > 0 ? `${selectedCount} selected` : 'None selected'}
          </span>
          <button
            onClick={selectAllCompleted}
            className="text-accent hover:underline"
          >
            Select All
          </button>
          <span className="text-muted">|</span>
          <button
            onClick={deselectAll}
            className="text-accent hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {completedImages.map((image) => (
          <ImageCard key={image.id} image={image} />
        ))}
      </div>
    </div>
  );
}
