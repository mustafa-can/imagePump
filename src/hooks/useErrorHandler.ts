'use client';

import { useCallback } from 'react';
import { toast } from '@/components/ui/Toast';
import { AppError, getErrorMessage, ErrorCodes } from '@/lib/errors';

export function useErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    console.error('Error caught:', error);

    if (error instanceof AppError) {
      const message = getErrorMessage(error.code);
      toast.error(message, {
        action:
          error.code === ErrorCodes.API_RATE_LIMITED
            ? {
                label: 'Retry',
                onClick: () => window.location.reload(),
              }
            : undefined,
      });
      return;
    }

    if (error instanceof Error) {
      // Check for common error messages
      if (error.message.includes('rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment.');
        return;
      }
      if (error.message.includes('API key')) {
        toast.error('Invalid API key. Please check your settings.');
        return;
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection.');
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.error('An unexpected error occurred');
  }, []);

  const wrapAsync = useCallback(
    <T>(fn: () => Promise<T>) => {
      return async () => {
        try {
          return await fn();
        } catch (error) {
          handleError(error);
          throw error;
        }
      };
    },
    [handleError]
  );

  return { handleError, wrapAsync };
}
