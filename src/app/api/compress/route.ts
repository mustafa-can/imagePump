import { NextRequest, NextResponse } from 'next/server';
import { compressImage } from '@/lib/compression';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const quality = formData.get('quality') as 'low' | 'medium' | 'high';

    if (!image) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    if (!quality || !['low', 'medium', 'high'].includes(quality)) {
      return NextResponse.json(
        { error: 'Valid quality setting is required (low, medium, high)' },
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
    const compressed = await compressImage(imageBuffer, { quality });

    return new NextResponse(new Uint8Array(compressed), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
        'X-Original-Size': String(imageBuffer.length),
        'X-Compressed-Size': String(compressed.length),
      },
    });
  } catch (error) {
    console.error('Compression error:', error);
    return NextResponse.json(
      { error: 'Compression failed' },
      { status: 500 }
    );
  }
}
