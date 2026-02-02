'use client';

import { useAppStore } from '@/store/useAppStore';
import PromptGroups from './PromptGroups';
import DefaultPrompt from './DefaultPrompt';

export default function PromptEditor() {
  const { images, promptGroups } = useAppStore();

  const ungroupedImages = images.filter((img) => !img.promptGroupId);
  const hasGroups = promptGroups.length > 0;

  return (
    <div className="space-y-6">
      {/* Default Prompt Section */}
      <DefaultPrompt />

      {/* Prompt Groups Section */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary">
              Prompt Groups
            </h3>
            <span className="text-xs text-tertiary">
              Create groups to apply different prompts to different images
            </span>
          </div>
          <PromptGroups />
        </div>
      )}

      {/* Summary */}
      {images.length > 0 && (
        <div className="p-3 bg-surface-secondary rounded-lg text-sm">
          <div className="font-medium text-secondary mb-2">Processing Summary</div>
          <ul className="space-y-1 text-tertiary">
            {hasGroups && promptGroups.map((group) => (
              <li key={group.id} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span className="truncate">
                  {group.name}: {group.imageIds.length} image(s)
                </span>
              </li>
            ))}
            {ungroupedImages.length > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tertiary flex-shrink-0" />
                <span>Default prompt: {ungroupedImages.length} image(s)</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
