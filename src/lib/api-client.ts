import OpenAI, { toFile } from 'openai';
import type { AIProvider, GenerationResult, AIProviderType } from '@/types';

// OpenAI Provider (DALL-E)
class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateImage(image: Buffer | null, prompt: string): Promise<GenerationResult> {
    try {
      if (image) {
        // Image editing mode
        const imageFile = await toFile(image, 'image.png', { type: 'image/png' });
        const response = await this.client.images.edit({
          model: 'dall-e-2',
          image: imageFile,
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        });
        const imageData = response.data?.[0]?.b64_json;
        if (!imageData) {
          return { success: false, error: 'No image data returned from API' };
        }
        return {
          success: true,
          imageBuffer: Buffer.from(imageData, 'base64'),
          usage: { credits: 1 },
        };
      } else {
        // Image generation mode (text-to-image)
        const response = await this.client.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        });
        const imageData = response.data?.[0]?.b64_json;
        if (!imageData) {
          return { success: false, error: 'No image data returned from API' };
        }
        return {
          success: true,
          imageBuffer: Buffer.from(imageData, 'base64'),
          usage: { credits: 1 },
        };
      }
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) return { success: false, error: 'Invalid API key' };
        if (error.status === 429) return { success: false, error: 'Rate limit exceeded' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Google Imagen Provider (via Gemini Image Generation)
class GoogleProvider implements AIProvider {
  name = 'google';
  private apiKey: string;
  private modelId: string;
  private lastRequestTime = 0;
  private minRequestInterval = 6000; // 6 seconds = max 10 requests/minute

  constructor(apiKey: string, modelId: string = 'gemini-2.5-flash-image') {
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  async generateImage(image: Buffer | null, prompt: string, retryCount = 0): Promise<GenerationResult> {
    try {
      await this.waitForRateLimit();

      // Build parts: always include text, only include image for editing
      const parts: Record<string, unknown>[] = [{ text: prompt }];
      if (image) {
        parts.push({
          inline_data: {
            mime_type: 'image/png',
            data: image.toString('base64'),
          },
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT'],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}`;

        // Handle rate limiting with exponential backoff
        if (response.status === 429 && retryCount < 3) {
          const waitTime = Math.pow(2, retryCount + 1) * 10000; // 20s, 40s, 80s
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.generateImage(image, prompt, retryCount + 1);
        }

        return { success: false, error: errorMsg };
      }

      const data = await response.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData
      );

      if (!imagePart?.inlineData?.data) {
        return { success: false, error: 'No image data returned from Google API' };
      }

      return {
        success: true,
        imageBuffer: Buffer.from(imagePart.inlineData.data, 'base64'),
        usage: { credits: 1 },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Stability AI Provider
class StabilityProvider implements AIProvider {
  name = 'stability';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(image: Buffer | null, prompt: string): Promise<GenerationResult> {
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('output_format', 'png');

      if (image) {
        formData.append('image', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'image.png');
        formData.append('strength', '0.7');
        formData.append('mode', 'image-to-image');
      } else {
        formData.append('mode', 'text-to-image');
      }

      const response = await fetch(
        'https://api.stability.ai/v2beta/stable-image/generate/sd3',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'image/*',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.errors?.join(', ') || errorData.message || errorData.name || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        success: true,
        imageBuffer: Buffer.from(arrayBuffer),
        usage: { credits: 1 },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Leonardo.AI Provider
class LeonardoProvider implements AIProvider {
  name = 'leonardo';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(image: Buffer | null, prompt: string): Promise<GenerationResult> {
    try {
      // Build generation request body
      const genBody: Record<string, unknown> = {
        prompt,
        num_images: 1,
        width: 1024,
        height: 1024,
      };

      if (image) {
        // Image editing: upload init image first
        const uploadResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/init-image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ extension: 'png' }),
        });

        if (!uploadResponse.ok) {
          return { success: false, error: 'Failed to initialize upload' };
        }

        const uploadData = await uploadResponse.json();
        const { url: presignedUrl, fields, id: initImageId } = uploadData.uploadInitImage;

        const uploadFormData = new FormData();
        Object.entries(fields as Record<string, string>).forEach(([key, value]) => {
          uploadFormData.append(key, value);
        });
        uploadFormData.append('file', new Blob([new Uint8Array(image)], { type: 'image/png' }));

        await fetch(presignedUrl, { method: 'POST', body: uploadFormData });

        genBody.init_image_id = initImageId;
        genBody.init_strength = 0.5;
      }

      const generateResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(genBody),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Generation failed' };
      }

      const genData = await generateResponse.json();
      const generationId = genData.sdGenerationJob?.generationId;

      if (!generationId) {
        return { success: false, error: 'No generation ID returned' };
      }

      // Poll for results
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusResponse = await fetch(
          `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
          {
            headers: { Authorization: `Bearer ${this.apiKey}` },
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const imageUrl = statusData.generations_by_pk?.generated_images?.[0]?.url;

          if (imageUrl) {
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            return {
              success: true,
              imageBuffer: Buffer.from(arrayBuffer),
              usage: { credits: 1 },
            };
          }
        }
      }

      return { success: false, error: 'Generation timed out' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// ClipDrop Provider
class ClipDropProvider implements AIProvider {
  name = 'clipdrop';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(image: Buffer | null, prompt: string): Promise<GenerationResult> {
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);

      if (image) {
        formData.append('image_file', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'image.png');
      }

      const response = await fetch('https://clipdrop-api.co/replace-background/v1', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText || `HTTP ${response.status}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        success: true,
        imageBuffer: Buffer.from(arrayBuffer),
        usage: { credits: 1 },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Midjourney Provider (placeholder - requires unofficial API or Discord bot)
class MidjourneyProvider implements AIProvider {
  name = 'midjourney';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateImage(_image: Buffer | null, _prompt: string): Promise<GenerationResult> {
    // Midjourney doesn't have an official API
    // This would require using an unofficial API service
    return {
      success: false,
      error: 'Midjourney integration requires an unofficial API service. Please configure your Midjourney API endpoint.',
    };
  }
}

// Local Stable Diffusion Provider (Automatic1111 WebUI)
class LocalSDProvider implements AIProvider {
  name = 'localsd';
  private baseUrl: string;

  constructor(apiKeyOrUrl: string) {
    // apiKey field is used for the URL - default to localhost:7860
    this.baseUrl = apiKeyOrUrl?.trim() || 'http://127.0.0.1:7860';
    // Remove trailing slash
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  async generateImage(image: Buffer | null, prompt: string): Promise<GenerationResult> {
    try {
      let endpoint: string;
      let requestBody: Record<string, unknown>;

      if (image) {
        // img2img - image editing
        endpoint = `${this.baseUrl}/sdapi/v1/img2img`;
        requestBody = {
          init_images: [`data:image/png;base64,${image.toString('base64')}`],
          prompt,
          negative_prompt: 'blurry, distorted, deformed',
          steps: 25,
          cfg_scale: 7,
          width: 512,
          height: 512,
          denoising_strength: 0.35,
          sampler_name: 'Euler a',
        };
      } else {
        // txt2img - text-to-image generation
        endpoint = `${this.baseUrl}/sdapi/v1/txt2img`;
        requestBody = {
          prompt,
          negative_prompt: 'blurry, distorted, deformed',
          steps: 25,
          cfg_scale: 7,
          width: 512,
          height: 512,
          sampler_name: 'Euler a',
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `Local SD error (${response.status}): ${errorText || 'Connection failed. Is Automatic1111 running on ' + this.baseUrl + '?'}`,
        };
      }

      const data = await response.json();

      if (!data.images || data.images.length === 0) {
        return { success: false, error: 'No image generated' };
      }

      // Response contains base64 images
      const imageBuffer = Buffer.from(data.images[0], 'base64');
      return {
        success: true,
        imageBuffer,
        usage: { credits: 0 }, // Free!
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
        return {
          success: false,
          error: `Cannot connect to Local SD at ${this.baseUrl}. Make sure Automatic1111 WebUI is running with --api flag.`
        };
      }
      return { success: false, error: errorMessage };
    }
  }
}

// Together AI Provider (FLUX models)
class TogetherAIProvider implements AIProvider {
  name = 'togetherai';
  private apiKey: string;

  constructor(apiKey: string) {   
    this.apiKey = apiKey;
  }

  async generateImage(image: Buffer | null, prompt: string): Promise<GenerationResult> {
    try {
      // Image editing: try FLUX Kontext first
      if (image) {
        try {
          const base64Image = image.toString('base64');
          const kontextResponse = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'black-forest-labs/FLUX.1-Kontext-pro',
              prompt: prompt,
              image_url: `data:image/png;base64,${base64Image}`,
              width: 1024,
              height: 1024,
              steps: 28,
              n: 1,
              response_format: 'b64_json',
            }),
          });

          if (kontextResponse.ok) {
            const data = await kontextResponse.json();
            const imageData = data.data?.[0]?.b64_json;
            if (imageData) {
              return {
                success: true,
                imageBuffer: Buffer.from(imageData, 'base64'),
                usage: { credits: 1 },
              };
            }
          }
        } catch {
          // Kontext not available, fall through to schnell
        }
      }

      // Text-to-image generation (or fallback from Kontext)
      const schnellResponse = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell-Free',
          prompt: prompt,
          width: 1024,
          height: 768,
          steps: 4,
          n: 1,
          response_format: 'b64_json',
        }),
      });

      if (!schnellResponse.ok) {
        const errorData = await schnellResponse.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `Together AI error: HTTP ${schnellResponse.status}`,
        };
      }

      const data = await schnellResponse.json();
      const imageData = data.data?.[0]?.b64_json;

      if (!imageData) {
        return { success: false, error: 'No image data returned from Together AI' };
      }

      return {
        success: true,
        imageBuffer: Buffer.from(imageData, 'base64'),
        usage: { credits: 0 }, // Free tier
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Provider factory
const providerCache = new Map<string, AIProvider>();

export function getAIProvider(providerType: AIProviderType, apiKey: string, options?: { geminiModel?: string }): AIProvider {
  const cacheKey = `${providerType}:${apiKey}:${options?.geminiModel || ''}`;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  let provider: AIProvider;

  switch (providerType) {
    case 'openai':
      provider = new OpenAIProvider(apiKey);
      break;
    case 'google':
      provider = new GoogleProvider(apiKey, options?.geminiModel);
      break;
    case 'stability':
      provider = new StabilityProvider(apiKey);
      break;
    case 'leonardo':
      provider = new LeonardoProvider(apiKey);
      break;
    case 'clipdrop':
      provider = new ClipDropProvider(apiKey);
      break;
    case 'midjourney':
      provider = new MidjourneyProvider(apiKey);
      break;

    case 'localsd':
      provider = new LocalSDProvider(apiKey);
      break;
    case 'togetherai':
      provider = new TogetherAIProvider(apiKey);
      break;
    default:
      throw new Error(`Unknown provider: ${providerType}`);
  }

  providerCache.set(cacheKey, provider);
  return provider;
}

export function clearProviderCache(): void {
  providerCache.clear();
}
