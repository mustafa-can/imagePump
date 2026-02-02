export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // Upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // API errors
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_UNAVAILABLE: 'API_UNAVAILABLE',

  // Processing errors
  GENERATION_FAILED: 'GENERATION_FAILED',
  COMPRESSION_FAILED: 'COMPRESSION_FAILED',

  // Download errors
  ZIP_GENERATION_FAILED: 'ZIP_GENERATION_FAILED',
  NO_IMAGES_TO_DOWNLOAD: 'NO_IMAGES_TO_DOWNLOAD',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCodes.FILE_TOO_LARGE]: 'File exceeds maximum size of 10MB',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Only JPEG, PNG, and WebP files are supported',
  [ErrorCodes.UPLOAD_FAILED]: 'Failed to upload file. Please try again.',
  [ErrorCodes.API_KEY_INVALID]: 'Invalid API key. Please check your settings.',
  [ErrorCodes.API_KEY_MISSING]: 'API key is required. Please enter your OpenAI API key.',
  [ErrorCodes.API_RATE_LIMITED]: 'Rate limit exceeded. Please wait a moment.',
  [ErrorCodes.API_QUOTA_EXCEEDED]: 'API quota exceeded. Check your billing.',
  [ErrorCodes.API_UNAVAILABLE]: 'AI service is currently unavailable. Please try again later.',
  [ErrorCodes.GENERATION_FAILED]: 'Image generation failed. Please try again.',
  [ErrorCodes.COMPRESSION_FAILED]: 'Image compression failed. Please try again.',
  [ErrorCodes.ZIP_GENERATION_FAILED]: 'Failed to generate download. Please try again.',
  [ErrorCodes.NO_IMAGES_TO_DOWNLOAD]: 'No completed images to download.',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code as ErrorCode] || 'An unexpected error occurred';
}

/**
 * Formats raw API error messages into user-friendly text
 */
export function formatErrorMessage(error: string | undefined): string {
  if (!error) return 'An unexpected error occurred';

  // Try to parse JSON error
  try {
    const parsed = JSON.parse(error);
    if (parsed.message) return formatErrorMessage(parsed.message);
    if (parsed.error?.message) return formatErrorMessage(parsed.error.message);
    if (parsed.errors && Array.isArray(parsed.errors)) {
      return parsed.errors.join(', ');
    }
  } catch {
    // Not JSON, continue with string processing
  }

  // Common API error patterns
  const errorMappings: [RegExp | string, string][] = [
    [/invalid.?api.?key/i, 'Invalid API key. Please check your settings.'],
    [/unauthorized|401/i, 'Authentication failed. Please check your API key.'],
    [/rate.?limit|429/i, 'Rate limit exceeded. Please wait a moment.'],
    [/quota.?exceeded|billing/i, 'API quota exceeded. Check your billing.'],
    [/bad.?request|400/i, 'Invalid request. Please try a different prompt or image.'],
    [/not.?found|404/i, 'Service not found. Please check your settings.'],
    [/internal.?server|500/i, 'Server error. Please try again later.'],
    [/service.?unavailable|503/i, 'Service temporarily unavailable. Try again later.'],
    [/timeout|timed?.?out/i, 'Request timed out. Please try again.'],
    [/connection.?refused|ECONNREFUSED/i, 'Cannot connect to service. Is it running?'],
    [/invalid.?prompt/i, 'Invalid prompt. Try rephrasing your request.'],
    [/content.?policy|safety|nsfw/i, 'Content blocked by safety filters. Try a different prompt.'],
    [/too.?large|size.?limit/i, 'Image is too large. Try a smaller image.'],
    [/unsupported.?format/i, 'Unsupported image format. Use JPEG, PNG, or WebP.'],
  ];

  for (const [pattern, message] of errorMappings) {
    if (typeof pattern === 'string' ? error.includes(pattern) : pattern.test(error)) {
      return message;
    }
  }

  // Clean up technical error messages
  let cleaned = error
    .replace(/^Error:\s*/i, '')
    .replace(/HTTP\s*\d{3}:\s*/i, '')
    .replace(/\{.*\}/g, '') // Remove JSON objects
    .replace(/\[.*\]/g, '') // Remove JSON arrays
    .trim();

  // Truncate long messages
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 97) + '...';
  }

  return cleaned || 'An unexpected error occurred';
}
