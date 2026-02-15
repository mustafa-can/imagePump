'use client';

import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/components/ui/Toast';
import { sleep } from '@/lib/rate-limit';

declare global {
  interface Window {
    puter?: {
      ai: {
        txt2img: (prompt: string, options: Record<string, unknown>) => Promise<HTMLImageElement>;
      };
    };
  }
}

interface ProcessingOptions {
  delayBetweenImages?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export function useImageProcessing(options: ProcessingOptions = {}) {
  const {
    delayBetweenImages = 1000,
    retryAttempts = 2,
    retryDelay = 2000,
  } = options;

  const {
    images,
    promptGroups,
    defaultPrompt,
    selectedProvider,
    geminiModel,
    mode,
    getActiveApiKey,
    isProcessing,
    startProcessing,
    stopProcessing,
    updateImageStatus,
    updateImageProgress,
    setCurrentProcessingId,
  } = useAppStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Get the prompt for an image (either from its group or the default)
  const getPromptForImage = useCallback(
    (imageId: string): string | null => {
      const image = images.find((img) => img.id === imageId);
      if (!image) return null;

      // Check if image belongs to a group
      if (image.promptGroupId) {
        const group = promptGroups.find((g) => g.id === image.promptGroupId);
        if (group?.prompt) return group.prompt;
      }

      // Fall back to default prompt
      return defaultPrompt || null;
    },
    [images, promptGroups, defaultPrompt]
  );

  const processImage = useCallback(
    async (imageId: string, prompt: string, attempt = 1): Promise<boolean> => {
      const image = images.find((img) => img.id === imageId);
      if (!image) return false;

      const apiKey = getActiveApiKey();
      if (!apiKey) return false;

      try {
        updateImageProgress(imageId, 10);

        if (selectedProvider === 'puter') {
          // Wait for Puter SDK if it's not immediately available
          let puter = window.puter;
          if (!puter) {
            // Wait up to 10 seconds for the SDK to load
            for (let i = 0; i < 100; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              puter = window.puter;
              if (puter) break;
            }
          }

          if (!puter) {
            throw new Error('Puter SDK not loaded. Please disable ad-blockers and refresh the page.');
          }

          updateImageProgress(imageId, 30);

          const puterOptions: Record<string, unknown> = {
            model: 'gemini-2.5-flash-image-preview',
          };

          // Include input image for edit mode, or generate mode with uploaded images
          if (image.file) {
            const base64Image = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(image.file);
            });
            puterOptions.input_image = base64Image;
            puterOptions.input_image_mime_type = 'image/png';
          }

          updateImageProgress(imageId, 50);

          const imageElement = await puter.ai.txt2img(prompt, puterOptions);

          updateImageProgress(imageId, 90);

          // Convert img element (src is usually a blob or base64) to Blob
          const response = await fetch(imageElement.src);
          const blob = await response.blob();

          updateImageProgress(imageId, 100);
          updateImageStatus(imageId, 'completed', blob);
          return true;
        }

        // Standard backend API generation
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('provider', selectedProvider);
        formData.append('mode', mode);
        formData.append('image', image.file);
        if (selectedProvider === 'google') {
          const { GEMINI_MODELS } = await import('@/types');
          formData.append('geminiModel', GEMINI_MODELS[geminiModel].modelId);
        }

        updateImageProgress(imageId, 30);

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: formData,
          signal: abortControllerRef.current?.signal,
        });

        updateImageProgress(imageId, 70);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const blob = await response.blob();
        updateImageProgress(imageId, 100);
        updateImageStatus(imageId, 'completed', blob);
        return true;
      } catch (error) {
        console.error('Processing error:', error);

        if (error instanceof Error && error.name === 'AbortError') {
          updateImageStatus(imageId, 'pending');
          return false;
        }

        // Retry logic
        if (attempt < retryAttempts) {
          toast.warning(`Retrying ${image.file.name}...`);
          await sleep(retryDelay);
          return processImage(imageId, prompt, attempt + 1);
        }

        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String((error as { message: unknown }).message);
        }

        updateImageStatus(imageId, 'failed', undefined, errorMessage);
        return false;
      }
    },
    [images, selectedProvider, geminiModel, mode, getActiveApiKey, updateImageProgress, updateImageStatus, retryAttempts, retryDelay]
  );

  // Generate a single image without an uploaded source (for ai-generate mode without images)
  const generateSingle = useCallback(
    async (prompt: string): Promise<boolean> => {
      const apiKey = getActiveApiKey();
      if (!apiKey) return false;

      try {
        if (selectedProvider === 'puter') {
          let puter = window.puter;
          if (!puter) {
            for (let i = 0; i < 100; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              puter = window.puter;
              if (puter) break;
            }
          }
          if (!puter) throw new Error('Puter SDK not loaded.');

          const imageElement = await puter.ai.txt2img(prompt, {
            model: 'gemini-2.5-flash-image-preview',
          });
          const response = await fetch(imageElement.src);
          const blob = await response.blob();
          // Create a placeholder file for the result
          const file = new File([blob], 'generated.png', { type: 'image/png' });
          const { addImages, updateImageStatus: updateStatus } = useAppStore.getState();
          addImages([file]);
          const newImages = useAppStore.getState().images;
          const newImage = newImages[newImages.length - 1];
          updateStatus(newImage.id, 'completed', blob);
          return true;
        }

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('provider', selectedProvider);
        formData.append('mode', 'ai-generate');
        if (selectedProvider === 'google') {
          const { GEMINI_MODELS } = await import('@/types');
          formData.append('geminiModel', GEMINI_MODELS[geminiModel].modelId);
        }

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: formData,
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const blob = await response.blob();
        // Create a placeholder image entry for the generated result
        const file = new File([blob], 'generated.png', { type: 'image/png' });
        const { addImages, updateImageStatus: updateStatus } = useAppStore.getState();
        addImages([file]);
        const newImages = useAppStore.getState().images;
        const newImage = newImages[newImages.length - 1];
        updateStatus(newImage.id, 'completed', blob);
        return true;
      } catch (error) {
        console.error('Generation error:', error);
        toast.error(error instanceof Error ? error.message : 'Generation failed');
        return false;
      }
    },
    [selectedProvider, geminiModel, getActiveApiKey]
  );

  const processAll = useCallback(async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      toast.error('Please set an API key for the selected provider');
      return;
    }

    const pendingImages = images.filter((img) => img.status === 'pending');

    // In generate mode, allow processing without images (single generation from prompt)
    if (pendingImages.length === 0 && mode === 'ai-generate') {
      if (!defaultPrompt) {
        toast.error('Please set a prompt for generation');
        return;
      }

      abortControllerRef.current = new AbortController();
      startProcessing();

      const success = await generateSingle(defaultPrompt);

      stopProcessing();
      abortControllerRef.current = null;

      if (success) {
        toast.success('Successfully generated 1 image');
      } else {
        toast.error('Failed to generate image');
      }
      return;
    }

    if (pendingImages.length === 0) {
      toast.error('No images to process');
      return;
    }

    // Validate prompts
    const imagesWithoutPrompt = pendingImages.filter((img) => !getPromptForImage(img.id));
    if (imagesWithoutPrompt.length > 0) {
      toast.error(`${imagesWithoutPrompt.length} image(s) have no prompt assigned. Please set a default prompt or assign them to a group.`);
      return;
    }

    abortControllerRef.current = new AbortController();
    startProcessing();

    let successCount = 0;
    let failCount = 0;

    for (const image of pendingImages) {
      if (abortControllerRef.current?.signal.aborted) break;

      setCurrentProcessingId(image.id);
      updateImageStatus(image.id, 'processing');

      const prompt = getPromptForImage(image.id);
      if (prompt) {
        const success = await processImage(image.id, prompt);

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        updateImageStatus(image.id, 'failed', undefined, 'No prompt assigned');
        failCount++;
      }

      // Delay between images to respect rate limits
      if (pendingImages.indexOf(image) < pendingImages.length - 1) {
        await sleep(delayBetweenImages);
      }
    }

    stopProcessing();
    abortControllerRef.current = null;

    if (successCount > 0) {
      toast.success(`Successfully ${mode === 'ai-generate' ? 'generated' : 'processed'} ${successCount} image(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to ${mode === 'ai-generate' ? 'generate' : 'process'} ${failCount} image(s)`);
    }
  }, [
    images,
    mode,
    defaultPrompt,
    getActiveApiKey,
    getPromptForImage,
    startProcessing,
    stopProcessing,
    setCurrentProcessingId,
    updateImageStatus,
    processImage,
    generateSingle,
    delayBetweenImages,
  ]);

  const cancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    stopProcessing();
    toast.info('Processing cancelled');
  }, [stopProcessing]);

  // Check if processing can start
  const pendingImages = images.filter((img) => img.status === 'pending');
  const hasApiKey = !!getActiveApiKey();
  const hasPrompts = pendingImages.some((img) => !!getPromptForImage(img.id));
  // In generate mode, can start with just a prompt and API key (no images needed)
  const canGenerateWithoutImages = mode === 'ai-generate' && hasApiKey && !!defaultPrompt && pendingImages.length === 0;

  return {
    processAll,
    cancelProcessing,
    isProcessing,
    canProcess: !isProcessing && ((pendingImages.length > 0 && hasApiKey && hasPrompts) || canGenerateWithoutImages),
    pendingCount: pendingImages.length,
    getPromptForImage,
  };
}
