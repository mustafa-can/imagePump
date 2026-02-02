'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toast } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';

declare global {
  interface Window {
    puter?: {
      ai: {
        txt2img: (prompt: string, options: Record<string, unknown>) => Promise<HTMLImageElement>;
      };
    };
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    // Manually inject Puter SDK to bypass hydration issues
    if (typeof window !== 'undefined' && !window.puter) {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      script.id = 'puter-sdk-manual';
      script.onload = () => console.log('Puter SDK loaded successfully');
      script.onerror = () => console.error('Puter SDK failed to load. Are you using an ad-blocker?');
      document.head.appendChild(script);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toast />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
