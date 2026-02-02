'use client';

import { useAppStore } from '@/store/useAppStore';

const SUGGESTIONS = [
  'Remove the background and make it transparent',
  'Add a soft blur to the background',
  'Convert to a watercolor painting style',
  'Make it look like a vintage photograph',
  'Add dramatic lighting and shadows',
  'Transform into a cartoon illustration',
  'Apply a warm sunset color grade',
  'Remove all text and logos',
];

interface PromptSuggestionsProps {
  onSelect?: (prompt: string) => void;
}

export default function PromptSuggestions({ onSelect }: PromptSuggestionsProps) {
  const { setDefaultPrompt, isProcessing } = useAppStore();

  const handleSelect = (suggestion: string) => {
    if (onSelect) {
      onSelect(suggestion);
    } else {
      setDefaultPrompt(suggestion);
    }
  };

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">Quick suggestions:</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSelect(suggestion)}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
