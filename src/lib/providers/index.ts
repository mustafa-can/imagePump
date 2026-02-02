import type { AIProviderConfig, AIProviderType } from '@/types';

export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI (DALL-E)',
    description: 'DALL-E 2/3 image editing and generation',
    apiKeyPlaceholder: 'sk-...',
    apiKeyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: true,
    },
  },
  google: {
    id: 'google',
    name: 'Google (Gemini)',
    description: 'Gemini 2.0 Flash image generation',
    apiKeyPlaceholder: 'AIza...',
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: true,
    },
  },
  stability: {
    id: 'stability',
    name: 'Stability AI',
    description: 'Stable Diffusion image editing',
    apiKeyPlaceholder: 'sk-...',
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: true,
    },
  },
  midjourney: {
    id: 'midjourney',
    name: 'Midjourney',
    description: 'Midjourney via unofficial API',
    apiKeyPlaceholder: 'mj-...',
    features: {
      imageEdit: false,
      imageGeneration: true,
      inpainting: false,
    },
  },
  leonardo: {
    id: 'leonardo',
    name: 'Leonardo.AI',
    description: 'Leonardo AI image generation',
    apiKeyPlaceholder: 'Bearer ...',
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: true,
    },
  },
  clipdrop: {
    id: 'clipdrop',
    name: 'ClipDrop (Stability)',
    description: 'ClipDrop by Stability AI',
    apiKeyPlaceholder: 'Your API key',
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: true,
    },
  },
  localsd: {
    id: 'localsd',
    name: 'Local SD (Free)',
    description: 'SD WebUI Forge - localhost:7860',
    apiKeyPlaceholder: 'http://127.0.0.1:7860 (or leave empty)',
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: true,
    },
  },
  puter: {
    id: 'puter',
    name: 'Puter (Free)',
    description: 'Free unlimited AI via Puter.js',
    apiKeyPlaceholder: 'No key required',
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: true,
    },
  },
  togetherai: {
    id: 'togetherai',
    name: 'Together AI (FLUX)',
    description: 'FLUX image generation - 3 months free',
    apiKeyPlaceholder: 'Your Together AI API key',
    features: {
      imageEdit: true,
      imageGeneration: true,
      inpainting: false,
    },
  },
};

export const PROVIDER_LIST = Object.values(AI_PROVIDERS);

export const GROUP_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function getNextGroupColor(usedColors: string[]): string {
  const available = GROUP_COLORS.filter((c) => !usedColors.includes(c));
  return available[0] || GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}
