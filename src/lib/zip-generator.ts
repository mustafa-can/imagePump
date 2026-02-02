import JSZip from 'jszip';
import type { ZipItem } from '@/types';

export async function generateZip(items: ZipItem[]): Promise<Blob> {
  const zip = new JSZip();

  for (const item of items) {
    zip.file(item.filename, item.data);
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export async function generateZipWithManifest(
  items: ZipItem[],
  metadata: Record<string, unknown>
): Promise<Blob> {
  const zip = new JSZip();

  // Add images to images folder
  const imagesFolder = zip.folder('images');
  for (const item of items) {
    imagesFolder?.file(item.filename, item.data);
  }

  // Add manifest
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        imageCount: items.length,
        ...metadata,
      },
      null,
      2
    )
  );

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export async function generateZipBuffer(items: ZipItem[]): Promise<Buffer> {
  const zip = new JSZip();

  for (const item of items) {
    zip.file(item.filename, item.data);
  }

  const arrayBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return Buffer.from(arrayBuffer);
}
