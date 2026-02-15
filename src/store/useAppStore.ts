import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppState, ImageItem, CompressionSettings, PromptGroup, AIProviderType, APIKeys, AppMode, GeminiModel } from '@/types';
import { getNextGroupColor } from '@/lib/providers';

const initialCompressionSettings: CompressionSettings = {
  enabled: false,
  quality: 'medium',
};

const initialApiKeys: APIKeys = {};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // App mode
        mode: 'ai-edit' as AppMode,
        setMode: (mode: AppMode) => {
          set({ mode });
        },

        // Image state
        images: [],

        addImages: (files: File[]) => {
          const newImages: ImageItem[] = files.map((file) => ({
            id: crypto.randomUUID(),
            file,
            preview: URL.createObjectURL(file),
            status: 'pending',
            progress: 0,
          }));
          set((state) => ({ images: [...state.images, ...newImages] }));
        },

        removeImage: (id: string) => {
          set((state) => {
            const image = state.images.find((img) => img.id === id);
            if (image?.preview) {
              URL.revokeObjectURL(image.preview);
            }
            // Also remove from any prompt groups
            const updatedGroups = state.promptGroups.map((group) => ({
              ...group,
              imageIds: group.imageIds.filter((imgId) => imgId !== id),
            }));
            return {
              images: state.images.filter((img) => img.id !== id),
              promptGroups: updatedGroups,
            };
          });
        },

        updateImageStatus: (id: string, status: ImageItem['status'], result?: Blob, error?: string) => {
          set((state) => ({
            images: state.images.map((img) =>
              img.id === id ? { ...img, status, result, error } : img
            ),
          }));
        },

        updateImageProgress: (id: string, progress: number) => {
          set((state) => ({
            images: state.images.map((img) =>
              img.id === id ? { ...img, progress } : img
            ),
          }));
        },

        assignImagesToGroup: (imageIds: string[], groupId: string) => {
          set((state) => {
            // Update images with the group ID
            const updatedImages = state.images.map((img) =>
              imageIds.includes(img.id) ? { ...img, promptGroupId: groupId } : img
            );

            // Update the group's imageIds
            const updatedGroups = state.promptGroups.map((group) => {
              if (group.id === groupId) {
                const newImageIds = [...new Set([...group.imageIds, ...imageIds])];
                return { ...group, imageIds: newImageIds };
              }
              // Remove these images from other groups
              return {
                ...group,
                imageIds: group.imageIds.filter((id) => !imageIds.includes(id)),
              };
            });

            return { images: updatedImages, promptGroups: updatedGroups };
          });
        },

        unassignImagesFromGroup: (imageIds: string[]) => {
          set((state) => {
            const updatedImages = state.images.map((img) =>
              imageIds.includes(img.id) ? { ...img, promptGroupId: undefined } : img
            );

            const updatedGroups = state.promptGroups.map((group) => ({
              ...group,
              imageIds: group.imageIds.filter((id) => !imageIds.includes(id)),
            }));

            return { images: updatedImages, promptGroups: updatedGroups };
          });
        },

        // Selection methods for downloads
        toggleImageSelection: (id: string) => {
          set((state) => ({
            images: state.images.map((img) =>
              img.id === id ? { ...img, selected: !img.selected } : img
            ),
          }));
        },

        selectAllCompleted: () => {
          set((state) => ({
            images: state.images.map((img) =>
              img.status === 'completed' && img.result
                ? { ...img, selected: true }
                : img
            ),
          }));
        },

        deselectAll: () => {
          set((state) => ({
            images: state.images.map((img) => ({ ...img, selected: false })),
          }));
        },

        // Prompt Groups state
        promptGroups: [],

        addPromptGroup: (name: string, prompt: string) => {
          const id = crypto.randomUUID();
          const usedColors = get().promptGroups.map((g) => g.color);
          const color = getNextGroupColor(usedColors);

          set((state) => ({
            promptGroups: [
              ...state.promptGroups,
              { id, name, prompt, imageIds: [], color },
            ],
          }));

          return id;
        },

        updatePromptGroup: (id: string, updates: Partial<Omit<PromptGroup, 'id'>>) => {
          set((state) => ({
            promptGroups: state.promptGroups.map((group) =>
              group.id === id ? { ...group, ...updates } : group
            ),
          }));
        },

        removePromptGroup: (id: string) => {
          set((state) => {
            // Unassign all images from this group
            const groupImageIds = state.promptGroups.find((g) => g.id === id)?.imageIds || [];
            const updatedImages = state.images.map((img) =>
              groupImageIds.includes(img.id) ? { ...img, promptGroupId: undefined } : img
            );

            return {
              promptGroups: state.promptGroups.filter((group) => group.id !== id),
              images: updatedImages,
            };
          });
        },

        // Default prompt for ungrouped images
        defaultPrompt: '',
        setDefaultPrompt: (prompt: string) => {
          set({ defaultPrompt: prompt });
        },

        // AI Provider state
        selectedProvider: 'openai',
        setSelectedProvider: (provider: AIProviderType) => {
          set({ selectedProvider: provider });
        },

        geminiModel: 'gemini-2.5-flash' as GeminiModel,
        setGeminiModel: (model: GeminiModel) => {
          set({ geminiModel: model });
        },

        apiKeys: initialApiKeys,
        setApiKey: (provider: AIProviderType, key: string) => {
          set((state) => ({
            apiKeys: { ...state.apiKeys, [provider]: key },
          }));
        },

        getActiveApiKey: () => {
          const state = get();
          if (state.selectedProvider === 'puter') return 'puter_free';
          return state.apiKeys[state.selectedProvider];
        },

        // Processing state
        isProcessing: false,
        currentProcessingId: null,

        startProcessing: () => {
          set({ isProcessing: true });
        },

        stopProcessing: () => {
          set({ isProcessing: false, currentProcessingId: null });
        },

        setCurrentProcessingId: (id: string | null) => {
          set({ currentProcessingId: id });
        },

        // Compression state
        compression: initialCompressionSettings,

        setCompression: (settings: Partial<CompressionSettings>) => {
          set((state) => ({
            compression: { ...state.compression, ...settings },
          }));
        },

        // Reset
        reset: () => {
          set((state) => {
            // Revoke all object URLs
            state.images.forEach((img) => {
              if (img.preview) {
                URL.revokeObjectURL(img.preview);
              }
            });
            return {
              images: [],
              promptGroups: [],
              defaultPrompt: '',
              isProcessing: false,
              currentProcessingId: null,
              compression: initialCompressionSettings,
              // Keep API keys and selected provider
            };
          });
        },

        resetCompletedImages: () => {
          set((state) => ({
            images: state.images.map((img) =>
              img.status === 'completed' || img.status === 'failed'
                ? { ...img, status: 'pending' as const, progress: 0, result: undefined, error: undefined }
                : img
            ),
          }));
        },
      }),
      {
        name: 'image-pump-storage',
        partialize: (state) => ({
          compression: state.compression,
          selectedProvider: state.selectedProvider,
          geminiModel: state.geminiModel,
          mode: state.mode,
          apiKeys: state.apiKeys,
        }),
      }
    )
  )
);
