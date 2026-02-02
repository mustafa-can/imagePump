'use client';

import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui';
import { formatErrorMessage } from '@/lib/errors';

export default function ImagePreview() {
  const { images, removeImage, isProcessing } = useAppStore();

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Uploaded Images ({images.length})
        </h3>
        {images.length > 0 && !isProcessing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const store = useAppStore.getState();
              store.reset();
            }}
          >
            Clear All
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
          >
            <Image
              src={image.preview}
              alt={image.file.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            />
            {/* Status overlay */}
            {image.status === 'processing' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
              </div>
            )}
            {image.status === 'completed' && (
              <div className="absolute top-2 right-2">
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Done
                </span>
              </div>
            )}
            {image.status === 'failed' && (
              <div className="absolute top-2 right-2 left-2">
                <span
                  className="bg-red-500 text-white text-xs px-2 py-1 rounded block truncate cursor-help"
                  title={image.error || 'Failed'}
                >
                  {formatErrorMessage(image.error)}
                </span>
              </div>
            )}
            {/* Remove button */}
            {!isProcessing && (
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-2 left-2 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {/* File name */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white text-xs truncate">{image.file.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
