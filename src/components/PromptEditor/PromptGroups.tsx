'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { Button, Modal } from '@/components/ui';

export default function PromptGroups() {
  const {
    images,
    promptGroups,
    addPromptGroup,
    updatePromptGroup,
    removePromptGroup,
    assignImagesToGroup,
    unassignImagesFromGroup,
    isProcessing,
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPrompt, setNewGroupPrompt] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleAddGroup = () => {
    if (newGroupName && newGroupPrompt) {
      addPromptGroup(newGroupName, newGroupPrompt);
      setNewGroupName('');
      setNewGroupPrompt('');
      setShowAddModal(false);
    }
  };

  const handleAssignImages = (groupId: string) => {
    if (selectedImages.length > 0) {
      assignImagesToGroup(selectedImages, groupId);
      setSelectedImages([]);
      setShowAssignModal(null);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId]
    );
  };

  const openAssignModal = (groupId: string) => {
    setSelectedImages([]);
    setShowAssignModal(groupId);
  };

  return (
    <div className="space-y-3">
      {/* Existing Groups */}
      {promptGroups.map((group) => (
        <div
          key={group.id}
          className="border rounded-lg p-4"
          style={{ borderColor: group.color }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <span className="font-medium text-gray-900">{group.name}</span>
              <span className="text-xs text-gray-500">
                ({group.imageIds.length} images)
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAssignModal(group.id)}
                disabled={isProcessing}
              >
                Assign
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removePromptGroup(group.id)}
                disabled={isProcessing}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Prompt textarea */}
          <textarea
            value={group.prompt}
            onChange={(e) => updatePromptGroup(group.id, { prompt: e.target.value })}
            disabled={isProcessing}
            placeholder="Enter prompt for this group..."
            className="w-full h-20 p-2 text-sm border border-gray-200 rounded resize-none focus:ring-1 focus:ring-blue-500"
          />

          {/* Assigned images preview */}
          {group.imageIds.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Assigned Images:</span>
                <button
                  onClick={() => unassignImagesFromGroup(group.imageIds)}
                  className="text-xs text-red-600 hover:text-red-700"
                  disabled={isProcessing}
                >
                  Remove all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.imageIds.slice(0, 6).map((imageId) => {
                  const image = images.find((img) => img.id === imageId);
                  if (!image) return null;
                  return (
                    <div
                      key={imageId}
                      className="relative w-12 h-12 rounded overflow-hidden group"
                    >
                      <Image
                        src={image.preview}
                        alt={image.file.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                      <button
                        onClick={() => unassignImagesFromGroup([imageId])}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        disabled={isProcessing}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {group.imageIds.length > 6 && (
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    +{group.imageIds.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Group Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowAddModal(true)}
        disabled={isProcessing}
        className="w-full"
      >
        + Add Prompt Group
      </Button>

      {/* Add Group Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Prompt Group"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g., Background removal"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompt
            </label>
            <textarea
              value={newGroupPrompt}
              onChange={(e) => setNewGroupPrompt(e.target.value)}
              placeholder="Describe the edit for this group..."
              className="w-full h-24 p-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGroup} disabled={!newGroupName || !newGroupPrompt}>
              Create Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Images Modal */}
      <Modal
        isOpen={!!showAssignModal}
        onClose={() => setShowAssignModal(null)}
        title="Assign Images to Group"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select images to assign to this prompt group.
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {images.map((image) => {
              const isSelected = selectedImages.includes(image.id);
              const currentGroup = promptGroups.find((g) => g.imageIds.includes(image.id));
              const isInOtherGroup = currentGroup && currentGroup.id !== showAssignModal;

              return (
                <button
                  key={image.id}
                  onClick={() => toggleImageSelection(image.id)}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                    ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}
                  `}
                >
                  <Image
                    src={image.preview}
                    alt={image.file.name}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {isInOtherGroup && (
                    <div
                      className="absolute bottom-1 left-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: currentGroup.color }}
                      title={`In group: ${currentGroup.name}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-gray-600">
              {selectedImages.length} image(s) selected
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAssignModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => showAssignModal && handleAssignImages(showAssignModal)}
                disabled={selectedImages.length === 0}
              >
                Assign to Group
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
