import OpenAI, { toFile } from 'openai';
import type { AIProvider, GenerationResult, AIProviderType } from '@/types';

// OpenAI Provider (DALL-E)
class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateImage(image: Buffer, prompt: string): Promise<GenerationResult> {
    try {
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
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) return { success: false, error: 'Invalid API key' };
        if (error.status === 429) return { success: false, error: 'Rate limit exceeded' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Google Imagen Provider (via Gemini 2.0 Flash Image Generation)
class GoogleProvider implements AIProvider {
  name = 'google';
  private apiKey: string;
  private lastRequestTime = 0;
  private minRequestInterval = 6000; // 6 seconds = max 10 requests/minute

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  async generateImage(image: Buffer, prompt: string, retryCount = 0): Promise<GenerationResult> {
    try {
      await this.waitForRateLimit();

      const base64Image = image.toString('base64');

      // Using Gemini 2.0 Flash experimental for image generation/editing
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['image', 'text'],
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

  async generateImage(image: Buffer, prompt: string): Promise<GenerationResult> {
    try {
      const formData = new FormData();
      formData.append('image', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'image.png');
      formData.append('prompt', prompt);
      formData.append('output_format', 'png');
      formData.append('strength', '0.7'); // Controls how much to change (0-1)
      formData.append('mode', 'image-to-image');

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

  async generateImage(image: Buffer, prompt: string): Promise<GenerationResult> {
    try {
      // First, upload the init image
      const uploadResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/init-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extension: 'png',
        }),
      });

      if (!uploadResponse.ok) {
        return { success: false, error: 'Failed to initialize upload' };
      }

      const uploadData = await uploadResponse.json();
      const { url: presignedUrl, fields, id: initImageId } = uploadData.uploadInitImage;

      // Upload to presigned URL
      const uploadFormData = new FormData();
      Object.entries(fields as Record<string, string>).forEach(([key, value]) => {
        uploadFormData.append(key, value);
      });
      uploadFormData.append('file', new Blob([new Uint8Array(image)], { type: 'image/png' }));

      await fetch(presignedUrl, { method: 'POST', body: uploadFormData });

      // Generate image
      const generateResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          init_image_id: initImageId,
          init_strength: 0.5,
          num_images: 1,
          width: 1024,
          height: 1024,
        }),
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

  async generateImage(image: Buffer, prompt: string): Promise<GenerationResult> {
    try {
      const formData = new FormData();
      formData.append('image_file', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'image.png');
      formData.append('prompt', prompt);

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
  async generateImage(_image: Buffer, _prompt: string): Promise<GenerationResult> {
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

  async generateImage(image: Buffer, prompt: string): Promise<GenerationResult> {
    try {
      const base64Image = image.toString('base64');

      // Automatic1111 img2img API
      // Lower denoising = more original preserved; Higher = more changes
      const requestBody = {
        init_images: [`data:image/png;base64,${base64Image}`],
        prompt: prompt,
        negative_prompt: 'blurry, distorted, deformed',
        steps: 25,
        cfg_scale: 7,
        width: 512,
        height: 512,
        denoising_strength: 0.35, // Low value preserves more of original
        sampler_name: 'Euler a',
      };

      const response = await fetch(`${this.baseUrl}/sdapi/v1/img2img`, {
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
//together ai
// Together AI Provider (FLUX models)
class TogetherAIProvider implements AIProvider {
  name = 'togetherai';
  private apiKey: string;

  constructor(apiKey: string) {   
    this.apiKey = apiKey;
  }

  async generateImage(image: Buffer, prompt: string): Promise<GenerationResult> {
    try {
      const base64Image = image.toString('base64');

      // Try FLUX Kontext for image editing (combines text + image input)
      // Falls back to FLUX schnell (text-to-image) if Kontext fails
      try {
        // FLUX Kontext - image editing model
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

      // Fallback: FLUX schnell (free tier - text-to-image only)
      // Note: This ignores the input image and generates based on prompt only
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

export function getAIProvider(providerType: AIProviderType, apiKey: string): AIProvider {
  const cacheKey = `${providerType}:${apiKey}`;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  let provider: AIProvider;

  switch (providerType) {
    case 'openai':
      provider = new OpenAIProvider(apiKey);
      break;
    case 'google':
      provider = new GoogleProvider(apiKey);
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
