import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/api-client';
import { rateLimit } from '@/lib/rate-limit';
import type { AIProviderType } from '@/types';

const VALID_PROVIDERS: AIProviderType[] = ['openai', 'google', 'stability', 'midjourney', 'leonardo', 'clipdrop', 'localsd'];

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimit(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;
    const providerType = formData.get('provider') as AIProviderType;
    const apiKey = request.headers.get('x-api-key');

    if (!image) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!providerType || !VALID_PROVIDERS.includes(providerType)) {
      return NextResponse.json(
        { error: 'Valid provider is required (openai, google, stability, leonardo, clipdrop)' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.' },
        { status: 400 }
      );
    }



    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const provider = getAIProvider(providerType, apiKey);
    const result = await provider.generateImage(imageBuffer, prompt);

    if (!result.success) {
      console.error('Provider error:', providerType, result.error);
      return NextResponse.json(
        { error: result.error || 'Image generation failed' },
        { status: 400 }
      );
    }

    return new NextResponse(result.imageBuffer ? new Uint8Array(result.imageBuffer) : null, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'X-Credits-Used': String(result.usage?.credits || 0),
        'X-Provider': providerType,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
