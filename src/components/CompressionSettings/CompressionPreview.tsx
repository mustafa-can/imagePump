'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatFileSize } from '@/lib/utils';

const QUALITY_MULTIPLIERS = {
  low: 0.15,
  medium: 0.35,
  high: 0.7,
};

export default function CompressionPreview() {
  const { images, compression } = useAppStore();

  const estimates = useMemo(() => {
    if (!compression.enabled || images.length === 0) {
      return null;
    }

    const totalOriginalSize = images.reduce((acc, img) => acc + img.file.size, 0);
    const multiplier = QUALITY_MULTIPLIERS[compression.quality];
    const estimatedSize = totalOriginalSize * multiplier;
    const savings = totalOriginalSize - estimatedSize;
    const savingsPercent = ((savings / totalOriginalSize) * 100).toFixed(0);

    return {
      originalSize: formatFileSize(totalOriginalSize),
      estimatedSize: formatFileSize(estimatedSize),
      savings: formatFileSize(savings),
      savingsPercent,
    };
  }, [images, compression]);

  if (!compression.enabled || !estimates) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
      <h4 className="text-sm font-medium text-blue-900 mb-2">Estimated Results</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-blue-700">Original size:</span>
          <span className="ml-2 font-medium">{estimates.originalSize}</span>
        </div>
        <div>
          <span className="text-blue-700">Compressed:</span>
          <span className="ml-2 font-medium">{estimates.estimatedSize}</span>
        </div>
        <div className="col-span-2">
          <span className="text-green-700">Estimated savings:</span>
          <span className="ml-2 font-medium text-green-600">
            {estimates.savings} ({estimates.savingsPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}
