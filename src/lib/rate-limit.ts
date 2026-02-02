import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const requests = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

export async function rateLimit(request: NextRequest): Promise<RateLimitResult> {
  const clientId = getClientId(request);
  const now = Date.now();

  const clientData = requests.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    requests.set(clientId, { count: 1, resetTime: now + WINDOW_MS });
    return {
      success: true,
      remaining: MAX_REQUESTS - 1,
      reset: now + WINDOW_MS,
    };
  }

  if (clientData.count >= MAX_REQUESTS) {
    return {
      success: false,
      remaining: 0,
      reset: clientData.resetTime,
    };
  }

  clientData.count++;
  return {
    success: true,
    remaining: MAX_REQUESTS - clientData.count,
    reset: clientData.resetTime,
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requests.entries()) {
    if (now > value.resetTime) {
      requests.delete(key);
    }
  }
}, WINDOW_MS);

// Helper for processing with rate limiting
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processWithRateLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options = { concurrency: 2, delayMs: 1000 }
): Promise<PromiseSettledResult<R>[]> {
  const queue = [...items];
  const results: PromiseSettledResult<R>[] = [];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        const result = await processor(item);
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
      await sleep(options.delayMs);
    }
  }

  await Promise.all(Array(options.concurrency).fill(null).map(worker));

  return results;
}
