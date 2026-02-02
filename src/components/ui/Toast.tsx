'use client';

import { Toaster } from 'sonner';

export default function Toast() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
        },
        className: 'shadow-lg',
      }}
    />
  );
}

export { toast } from 'sonner';
