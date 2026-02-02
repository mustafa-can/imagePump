'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { ImageItem } from '@/types';
import ImageComparison from './ImageComparison';
import { Button, Modal } from '@/components/ui';

interface ImageCardProps {
  image: ImageItem;
}

export default function ImageCard({ image }: ImageCardProps) {
  const [showComparison, setShowComparison] = useState(false);

  const resultUrl = useMemo(() => {
    if (image.result) {
      return URL.createObjectURL(image.result);
    }
    return null;
  }, [image.result]);

  const handleDownloadSingle = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `edited-${image.file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!resultUrl) return null;

  return (
    <>
      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="relative aspect-square">
          <Image
            src={resultUrl}
            alt={`Edited ${image.file.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-secondary truncate mb-2">
            {image.file.name}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComparison(true)}
              className="flex-1"
            >
              Compare
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadSingle}
              className="flex-1"
            >
              Download
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        title="Before / After"
        size="xl"
      >
        <ImageComparison
          originalUrl={image.preview}
          resultUrl={resultUrl}
          filename={image.file.name}
        />
      </Modal>
    </>
  );
}
