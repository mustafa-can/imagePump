'use client';

export function Footer() {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} ImagePump. AI Image Batch Editor & Compressor.
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="mailto:yazimcizimcom@gmail.com"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Contact
            </a>
            <a
              href="https://github.com/sponsors/mustafa-can"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              Sponsor
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
