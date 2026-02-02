// AI Provider types
export type AIProviderType =
  | 'openai'
  | 'google'
  | 'stability'
  | 'midjourney'
  | 'leonardo'
  | 'clipdrop'
  | 'localsd'
  | 'puter'
  | 'togetherai';

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  description: string;
  apiKeyPlaceholder: string;
  apiKeyPattern?: RegExp;
  features: {
    imageEdit: boolean;
    imageGeneration: boolean;
    inpainting: boolean;
  };
}

export interface APIKeys {
  openai?: string;
  google?: string;
  stability?: string;
  midjourney?: string;
  leonardo?: string;
  clipdrop?: string;
  localsd?: string;
  puter?: string;
  togetherai?: string;
}

// Prompt Group types
export interface PromptGroup {
  id: string;
  name: string;
  prompt: string;
  imageIds: string[];
  color: string;
}

// Image types
export interface ImageItem {
  id: string;
  file: File;
  preview: string;
  promptGroupId?: string; // Which prompt group this image belongs to
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Blob;
  error?: string;
  progress: number;
}

export interface CompressionSettings {
  enabled: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface GenerationResult {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
  usage?: { credits: number };
}

export interface AIProvider {
  name: string;
  generateImage(image: Buffer, prompt: string): Promise<GenerationResult>;
}

export interface ZipItem {
  filename: string;
  data: Blob | Buffer;
}

export interface CompressionOptions {
  quality: 'low' | 'medium' | 'high';
  format?: 'jpeg' | 'webp' | 'png';
}

export interface QualityPreset {
  jpeg: number;
  webp: number;
  maxDimension: number;
}

export interface AppState {
  // Image state
  images: ImageItem[];
  addImages: (files: File[]) => void;
  removeImage: (id: string) => void;
  updateImageStatus: (id: string, status: ImageItem['status'], result?: Blob, error?: string) => void;
  updateImageProgress: (id: string, progress: number) => void;
  assignImagesToGroup: (imageIds: string[], groupId: string) => void;
  unassignImagesFromGroup: (imageIds: string[]) => void;

  // Prompt Groups state
  promptGroups: PromptGroup[];
  addPromptGroup: (name: string, prompt: string) => string;
  updatePromptGroup: (id: string, updates: Partial<Omit<PromptGroup, 'id'>>) => void;
  removePromptGroup: (id: string) => void;

  // Default prompt for ungrouped images
  defaultPrompt: string;
  setDefaultPrompt: (prompt: string) => void;

  // AI Provider state
  selectedProvider: AIProviderType;
  setSelectedProvider: (provider: AIProviderType) => void;
  apiKeys: APIKeys;
  setApiKey: (provider: AIProviderType, key: string) => void;
  getActiveApiKey: () => string | undefined;

  // Processing state
  isProcessing: boolean;
  currentProcessingId: string | null;
  startProcessing: () => void;
  stopProcessing: () => void;
  setCurrentProcessingId: (id: string | null) => void;

  // Compression state
  compression: CompressionSettings;
  setCompression: (settings: Partial<CompressionSettings>) => void;

  // Reset
  reset: () => void;
  resetCompletedImages: () => void;
}
