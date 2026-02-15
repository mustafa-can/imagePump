'use client';

import { useAppStore } from '@/store/useAppStore';

const EDIT_SUGGESTIONS = [
  'Remove the background and make it transparent',
  'Add a soft blur to the background',
  'Convert to a watercolor painting style',
  'Make it look like a vintage photograph',
  'Add dramatic lighting and shadows',
  'Transform into a cartoon illustration',
  'Apply a warm sunset color grade',
  'Remove all text and logos',
];

const GENERATE_SUGGESTIONS = [
  'A photorealistic landscape at golden hour',
  'Minimalist product photo on white background',
  'Abstract digital art with vibrant colors',
  'Isometric 3D illustration of a cozy room',
  'Professional headshot portrait, studio lighting',
  'Flat design icon set for a mobile app',
  'Watercolor painting of a flower bouquet',
  'Futuristic city skyline at night',
];

interface PromptSuggestionsProps {
  onSelect?: (prompt: string) => void;
}

export default function PromptSuggestions({ onSelect }: PromptSuggestionsProps) {
  const { setDefaultPrompt, isProcessing, mode } = useAppStore();

  const suggestions = mode === 'ai-generate' ? GENERATE_SUGGESTIONS : EDIT_SUGGESTIONS;

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
        {suggestions.map((suggestion) => (
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
