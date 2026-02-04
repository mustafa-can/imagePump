'use client';

import { useAppStore } from '@/store/useAppStore';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { useCompression } from '@/hooks/useCompression';
import { ImageUploader, ImagePreview, UploadStatus } from '@/components/ImageUploader';
import { PromptEditor } from '@/components/PromptEditor';
import { ProviderSelector } from '@/components/ProviderSelector';
import { QueueManager } from '@/components/ProcessingQueue';
import { CompressionSelector, CompressionPreview } from '@/components/CompressionSettings';
import { ResultsGallery } from '@/components/ResultsGallery';
import { DownloadButton, DownloadOptions } from '@/components/DownloadSection';
import { Button } from '@/components/ui';
import { Footer } from '@/components/Footer';
import { AI_PROVIDERS } from '@/lib/providers';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => { };

export default function Home() {
  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { images, isProcessing, reset, resetCompletedImages, selectedProvider, getActiveApiKey, mode, setMode } = useAppStore();
  const { processAll, cancelProcessing, canProcess, pendingCount } = useImageProcessing();
  const { compressAll, canCompress, pendingCount: compressPendingCount } = useCompression();

  const completedCount = images.filter((img) => img.status === 'completed').length;
  const failedCount = images.filter((img) => img.status === 'failed').length;
  const canRerun = (completedCount > 0 || failedCount > 0) && !isProcessing;
  const hasApiKey = !!getActiveApiKey();
  const currentProvider = AI_PROVIDERS[selectedProvider] || AI_PROVIDERS['google'];

  if (!hasMounted) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </main>
    );
  }

  const getButtonText = () => {
    if (mode === 'compress-only') {
      if (images.length === 0) return 'Upload Images First';
      if (compressPendingCount === 0) return 'No Pending Images';
      return `Compress ${compressPendingCount} Images`;
    }
    if (!hasApiKey) return `Set ${currentProvider.name} API Key`;
    if (images.length === 0) return 'Upload Images First';
    if (pendingCount === 0) return 'No Pending Images';
    return `Process ${pendingCount} Images with ${currentProvider.name}`;
  };

  const handleProcess = () => {
    if (mode === 'compress-only') {
      compressAll();
    } else {
      processAll();
    }
  };

  const canProcessOrCompress = mode === 'compress-only' ? canCompress : canProcess;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ImagePump</h1>
            <p className="text-sm text-gray-500">AI Image Batch Editor & Compressor</p>
          </div>
          <div className="flex items-center gap-3">
            {images.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Reset All
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selector */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                1. Select Mode
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('ai-edit')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    mode === 'ai-edit'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">AI Image Edit</div>
                  <div className="text-xs mt-1 opacity-75">Edit images with AI prompts</div>
                </button>
                <button
                  onClick={() => setMode('compress-only')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    mode === 'compress-only'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Compress Only</div>
                  <div className="text-xs mt-1 opacity-75">Compress without AI editing</div>
                </button>
              </div>
            </section>

            {/* AI Provider Section - Only show in AI Edit mode */}
            {mode === 'ai-edit' && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  2. Select AI Provider
                </h2>
                <ProviderSelector />
              </section>
            )}

            {/* Upload Section */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {mode === 'ai-edit' ? '3. Upload Images' : '2. Upload Images'}
              </h2>
              <ImageUploader />
              <ImagePreview />
            </section>

            {/* Prompt Section - Only show in AI Edit mode */}
            {mode === 'ai-edit' && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  4. Configure Prompts
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Set a default prompt for all images, or create groups to apply different prompts to different images.
                </p>
                <PromptEditor />
              </section>
            )}

            {/* Compression Section */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {mode === 'ai-edit' ? '5. Compression (Optional)' : '3. Compression Settings'}
              </h2>
              {mode === 'compress-only' && (
                <p className="text-sm text-gray-500 mb-4">
                  Select the compression quality for your images.
                </p>
              )}
              <CompressionSelector />
              <CompressionPreview />
            </section>

            {/* Process Button */}
            <div className="flex gap-4">
              {isProcessing ? (
                <Button
                  variant="danger"
                  size="lg"
                  onClick={cancelProcessing}
                  className="flex-1"
                >
                  Cancel {mode === 'compress-only' ? 'Compression' : 'Processing'}
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handleProcess}
                    disabled={!canProcessOrCompress}
                    className={`flex-1 ${mode === 'compress-only' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    {getButtonText()}
                  </Button>
                  {canRerun && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={resetCompletedImages}
                      title="Reset completed images to pending and process again"
                    >
                      Rerun
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Results Gallery */}
            {completedCount > 0 && (
              <section className="bg-white rounded-lg shadow p-6">
                <ResultsGallery />
              </section>
            )}
          </div>

          {/* Right Column - Status & Download */}
          <div className="space-y-6">
            {/* Status Section */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Processing Status
              </h2>
              {images.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Upload images to get started
                </p>
              ) : (
                <>
                  <UploadStatus />
                  <div className="mt-4">
                    <QueueManager />
                  </div>
                </>
              )}
            </section>

            {/* Download Section */}
            {completedCount > 0 && (
              <section className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Download
                  </h2>
                  <DownloadOptions />
                </div>
                <DownloadButton />
              </section>
            )}

            {/* Help Section */}
            <section className={`${mode === 'compress-only' ? 'bg-green-50' : 'bg-blue-50'} rounded-lg p-6`}>
              <h3 className={`text-sm font-semibold ${mode === 'compress-only' ? 'text-green-900' : 'text-blue-900'} mb-2`}>
                How it works
              </h3>
              {mode === 'compress-only' ? (
                <ol className="text-sm text-green-800 space-y-2">
                  <li>1. Upload one or more images</li>
                  <li>2. Select compression quality</li>
                  <li>3. Compress and download results</li>
                </ol>
              ) : (
                <ol className="text-sm text-blue-800 space-y-2">
                  <li>1. Choose an AI provider and set API key</li>
                  <li>2. Upload one or more images</li>
                  <li>3. Set prompts (default or per-group)</li>
                  <li>4. Optionally enable compression</li>
                  <li>5. Process and download results</li>
                </ol>
              )}
            </section>

            {/* Supported Providers */}
            <section className="bg-gray-100 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Supported Providers
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• OpenAI (DALL-E 2/3)</li>
                <li>• Google (Gemini/Imagen)</li>
                <li>• Stability AI (Stable Diffusion)</li>
                <li>• Together AI (FLUX)</li>
                <li>• Leonardo.AI</li>
                <li>• ClipDrop</li>
                <li>• Midjourney (via API)</li>
                <li>• <strong>Local SD (Free!)</strong></li>
                <li>• <strong>Puter (Free!)</strong></li>
              </ul>
            </section>

          </div>
        </div>
      </div>
      </div>

      <Footer />
    </main>
  );
}
