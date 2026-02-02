import { NextRequest, NextResponse } from 'next/server';
import { generateZipBuffer } from '@/lib/zip-generator';

interface ImageData {
  filename: string;
  base64: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images } = body as { images: ImageData[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    // Validate each image
    for (const img of images) {
      if (!img.filename || typeof img.filename !== 'string') {
        return NextResponse.json(
          { error: 'Invalid image data: missing filename' },
          { status: 400 }
        );
      }
      if (!img.base64 || typeof img.base64 !== 'string') {
        return NextResponse.json(
          { error: 'Invalid image data: missing base64 data' },
          { status: 400 }
        );
      }
    }

    // Sanitize filenames to prevent path traversal
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
    };

    const zipItems = images.map((img) => ({
      filename: sanitizeFilename(img.filename),
      data: Buffer.from(img.base64, 'base64'),
    }));

    const zipBuffer = await generateZipBuffer(zipItems);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="imagepump-${Date.now()}.zip"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    );
  }
}
