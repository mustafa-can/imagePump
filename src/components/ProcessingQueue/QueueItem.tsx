'use client';

import Image from 'next/image';
import type { ImageItem } from '@/types';
import { ProgressBar } from '@/components/ui';
import { formatErrorMessage } from '@/lib/errors';

interface QueueItemProps {
  image: ImageItem;
}

export default function QueueItem({ image }: QueueItemProps) {
  const statusColors = {
    pending: 'bg-gray-100',
    processing: 'bg-blue-50 border-blue-200',
    completed: 'bg-green-50 border-green-200',
    failed: 'bg-red-50 border-red-200',
  };

  const statusIcons = {
    pending: (
      <span className="w-2 h-2 rounded-full bg-gray-400" />
    ),
    processing: (
      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
    ),
    completed: (
      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    failed: (
      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg border ${statusColors[image.status]}`}
    >
      <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden">
        <Image
          src={image.preview}
          alt={image.file.name}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">
          {image.file.name}
        </p>
        {image.status === 'processing' && (
          <ProgressBar progress={image.progress} size="sm" color="blue" />
        )}
        {image.status === 'failed' && image.error && (
          <p className="text-xs text-red-500 truncate" title={image.error}>
            {formatErrorMessage(image.error)}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {statusIcons[image.status]}
      </div>
    </div>
  );
}
