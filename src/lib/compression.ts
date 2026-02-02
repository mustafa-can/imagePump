import sharp from 'sharp';
import type { CompressionOptions, QualityPreset } from '@/types';

const QUALITY_PRESETS: Record<'low' | 'medium' | 'high', QualityPreset> = {
  low: { jpeg: 60, webp: 55, maxDimension: 1024 },
  medium: { jpeg: 80, webp: 75, maxDimension: 2048 },
  high: { jpeg: 92, webp: 90, maxDimension: 4096 },
};

export async function compressImage(
  imageBuffer: Buffer,
  options: CompressionOptions
): Promise<Buffer> {
  const preset = QUALITY_PRESETS[options.quality];
  const format = options.format || 'webp';

  let pipeline = sharp(imageBuffer).resize(preset.maxDimension, preset.maxDimension, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: preset.jpeg, progressive: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: preset.webp });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
  }

  return pipeline.toBuffer();
}

export async function estimateCompressedSize(
  imageBuffer: Buffer,
  quality: 'low' | 'medium' | 'high'
): Promise<number> {
  const compressed = await compressImage(imageBuffer, { quality });
  return compressed.length;
}

export function getQualityPreset(quality: 'low' | 'medium' | 'high'): QualityPreset {
  return QUALITY_PRESETS[quality];
}
