'use client';

import { useAppStore } from '@/store/useAppStore';
import ImageCard from './ImageCard';

export default function ResultsGallery() {
  const { images } = useAppStore();

  const completedImages = images.filter((img) => img.status === 'completed' && img.result);

  if (completedImages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">
          Results ({completedImages.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {completedImages.map((image) => (
          <ImageCard key={image.id} image={image} />
        ))}
      </div>
    </div>
  );
}
