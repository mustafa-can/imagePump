'use client';

import { useAppStore } from '@/store/useAppStore';

const QUALITY_OPTIONS = [
  {
    value: 'low' as const,
    label: 'Low',
    description: 'Smaller file size, lower quality',
    estimate: '~50-100KB',
  },
  {
    value: 'medium' as const,
    label: 'Medium',
    description: 'Balanced file size and quality',
    estimate: '~150-300KB',
  },
  {
    value: 'high' as const,
    label: 'High',
    description: 'Larger file size, better quality',
    estimate: '~400-800KB',
  },
];

export default function CompressionSelector() {
  const { compression, setCompression, isProcessing, mode } = useAppStore();

  // In compress-only mode, compression is always enabled
  const isCompressOnly = mode === 'compress-only';
  const showQualityOptions = isCompressOnly || compression.enabled;

  return (
    <div className="space-y-4">
      {/* Only show the toggle in AI Edit mode */}
      {!isCompressOnly && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-secondary">
            Compression Settings
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={compression.enabled}
              onChange={(e) => setCompression({ enabled: e.target.checked })}
              disabled={isProcessing}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-secondary">Enable compression</span>
          </label>
        </div>
      )}

      {showQualityOptions && (
        <div className="grid grid-cols-3 gap-3">
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setCompression({ quality: option.value })}
              disabled={isProcessing}
              className={`
                p-3 rounded-lg border-2 text-left transition-colors
                ${compression.quality === option.value
                  ? isCompressOnly ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
                  : 'border-default hover:border-hover'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="font-medium text-sm text-primary">{option.label}</div>
              <div className="text-xs text-tertiary mt-1">{option.description}</div>
              <div className="text-xs text-muted mt-1">{option.estimate}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
