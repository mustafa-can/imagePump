'use client';

import { useAppStore } from '@/store/useAppStore';
import PromptSuggestions from './PromptSuggestions';

export default function DefaultPrompt() {
  const { defaultPrompt, setDefaultPrompt, isProcessing, images, promptGroups } = useAppStore();

  const ungroupedCount = images.filter((img) => !img.promptGroupId).length;
  const hasGroups = promptGroups.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-secondary">
          {hasGroups ? 'Default Prompt' : 'Edit Prompt'}
        </label>
        {hasGroups && ungroupedCount > 0 && (
          <span className="text-xs text-tertiary">
            Applied to {ungroupedCount} ungrouped image(s)
          </span>
        )}
      </div>
      <p className="text-xs text-tertiary mb-3">
        {hasGroups
          ? 'This prompt applies to images not assigned to any group.'
          : 'Describe how you want your images to be modified.'}
      </p>
      <div className="relative">
        <textarea
          value={defaultPrompt}
          onChange={(e) => setDefaultPrompt(e.target.value)}
          disabled={isProcessing}
          placeholder="E.g., Remove the background and replace it with a sunset..."
          className={`
            w-full h-32 p-3 border rounded-lg resize-none
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-surface-secondary disabled:cursor-not-allowed
            ${defaultPrompt.length > 0 ? 'border-hover' : 'border-default'}
          `}
        />
        <div className="absolute bottom-3 right-3 text-xs text-muted">
          {defaultPrompt.length} characters
        </div>
      </div>
      <div className="mt-3">
        <PromptSuggestions onSelect={setDefaultPrompt} />
      </div>
    </div>
  );
}
