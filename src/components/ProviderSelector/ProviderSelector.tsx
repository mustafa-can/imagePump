'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AI_PROVIDERS, PROVIDER_LIST } from '@/lib/providers';
import { Button, Modal } from '@/components/ui';
import type { AIProviderType } from '@/types';

export default function ProviderSelector() {
  const {
    selectedProvider,
    setSelectedProvider,
    apiKeys,
    setApiKey,
    isProcessing,
  } = useAppStore();

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderType | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [isPuterLoaded, setIsPuterLoaded] = useState(false);

  // Check for Puter SDK on mount and every second until it's found
  useState(() => {
    if (typeof window !== 'undefined') {
      const checkPuter = () => {
        if (window.puter) {
          setIsPuterLoaded(true);
          return true;
        }
        return false;
      };

      if (!checkPuter()) {
        const interval = setInterval(() => {
          if (checkPuter()) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
      }
    }
  });

  const currentProvider = AI_PROVIDERS[selectedProvider] || AI_PROVIDERS['google'];
  const hasApiKey = !!apiKeys[selectedProvider];

  const handleProviderSelect = (providerId: AIProviderType) => {
    setSelectedProvider(providerId);
  };

  const handleEditApiKey = (providerId: AIProviderType) => {
    setEditingProvider(providerId);
    setTempApiKey(apiKeys[providerId] || '');
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = () => {
    if (editingProvider) {
      setApiKey(editingProvider, tempApiKey);
    }
    setShowApiKeyModal(false);
    setEditingProvider(null);
    setTempApiKey('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-secondary">AI Provider</label>
        {selectedProvider === 'puter' ? (
          isPuterLoaded ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Puter SDK Active
            </span>
          ) : (
            <span className="text-xs text-red-600 flex items-center gap-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Puter SDK Missing
            </span>
          )
        ) : hasApiKey ? (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            API Key Set
          </span>
        ) : (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            No API Key
          </span>
        )}
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PROVIDER_LIST.map((provider) => {
          const isSelected = selectedProvider === provider.id;
          const providerHasKey = provider.id === 'puter' || !!apiKeys[provider.id];

          return (
            <button
              key={provider.id}
              onClick={() => handleProviderSelect(provider.id)}
              disabled={isProcessing}
              className={`
                relative p-3 rounded-lg border-2 text-left transition-all
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-default hover:border-hover'}
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="font-medium text-sm text-primary">{provider.name}</div>
              <div className="text-xs text-tertiary mt-1 truncate">
                {provider.description}
              </div>
              {providerHasKey && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Set API Key Button */}
      {selectedProvider !== 'puter' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleEditApiKey(selectedProvider)}
          disabled={isProcessing}
          className="w-full"
        >
          {hasApiKey ? `Update ${currentProvider.name} API Key` : `Set ${currentProvider.name} API Key`}
        </Button>
      )}

      {/* API Key Modal */}
      <Modal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        title={`${editingProvider ? AI_PROVIDERS[editingProvider].name : ''} API Key`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Enter your API key for {editingProvider ? AI_PROVIDERS[editingProvider].name : 'this provider'}.
            Your key is stored in your browser&apos;s local storage and never sent to our servers.
          </p>
          <input
            type="password"
            value={tempApiKey}
            onChange={(e) => setTempApiKey(e.target.value)}
            placeholder={editingProvider ? AI_PROVIDERS[editingProvider].apiKeyPlaceholder : 'API Key'}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowApiKeyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
