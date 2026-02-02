'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/ui';

interface DownloadOptionsProps {
  onOptionsChange?: (options: DownloadSettings) => void;
}

interface DownloadSettings {
  format: 'png' | 'jpeg' | 'webp';
  naming: 'numbered' | 'original' | 'timestamp';
  includeOriginals: boolean;
}

const FORMAT_OPTIONS = [
  { value: 'png' as const, label: 'PNG', description: 'Lossless, larger files' },
  { value: 'jpeg' as const, label: 'JPEG', description: 'Smaller files, some quality loss' },
  { value: 'webp' as const, label: 'WebP', description: 'Best compression, modern format' },
];

const NAMING_OPTIONS = [
  { value: 'numbered' as const, label: 'Numbered', example: 'edited-1.png' },
  { value: 'original' as const, label: 'Original name', example: 'photo-edited.png' },
  { value: 'timestamp' as const, label: 'Timestamp', example: '1704067200-1.png' },
];

export default function DownloadOptions({ onOptionsChange }: DownloadOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<DownloadSettings>({
    format: 'png',
    naming: 'numbered',
    includeOriginals: false,
  });

  const handleSave = () => {
    onOptionsChange?.(settings);
    setIsOpen(false);
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        Options
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Download Options"
        size="md"
      >
        <div className="space-y-6">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Output Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings({ ...settings, format: option.value })}
                  className={`
                    p-2 rounded-lg border-2 text-left text-sm
                    ${settings.format === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-default hover:border-hover'
                    }
                  `}
                >
                  <div className="font-medium text-primary">{option.label}</div>
                  <div className="text-xs text-tertiary">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Naming convention */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              File Naming
            </label>
            <div className="space-y-2">
              {NAMING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-secondary cursor-pointer"
                >
                  <input
                    type="radio"
                    name="naming"
                    checked={settings.naming === option.value}
                    onChange={() => setSettings({ ...settings, naming: option.value })}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-primary">{option.label}</div>
                    <div className="text-xs text-tertiary">e.g., {option.example}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Include originals */}
          <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeOriginals}
              onChange={(e) =>
                setSettings({ ...settings, includeOriginals: e.target.checked })
              }
              className="rounded text-blue-600"
            />
            <div>
              <div className="text-sm font-medium text-primary">Include original images</div>
              <div className="text-xs text-tertiary">
                Add a separate folder with the original images
              </div>
            </div>
          </label>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Options</Button>
        </div>
      </Modal>
    </>
  );
}
