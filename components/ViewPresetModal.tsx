import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useViewState, ViewPreset, ViewMode } from '../hooks/useViewState';
import { useConfirmation } from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import { MaterialIcon, formInputClass, formInputSmClass, formPrimaryBtnClass } from './ApplicationFormUI';

interface ViewPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  currentState: any; // ViewState from useViewState
}

const ViewPresetModal: React.FC<ViewPresetModalProps> = ({ isOpen, onClose, viewMode, currentState }) => {
  useLockBodyScroll(isOpen);
  useEscapeKey(isOpen, onClose);
  const { savePreset, loadPreset, deletePreset, updatePreset, getPresetsForView } = useViewState(viewMode);
  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();
  const [presetName, setPresetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const presets = getPresetsForView();

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    setIsSaving(true);
    savePreset(presetName.trim(), currentState);
    setPresetName('');
    setIsSaving(false);
  };

  const handleLoadPreset = (presetId: string) => {
    if (loadPreset(presetId)) {
      onClose();
    }
  };

  const handleDeletePreset = (presetId: string) => {
    showConfirmation('Delete Preset', 'Are you sure you want to delete this preset?', () => deletePreset(presetId), true);
  };

  const handleStartEdit = (preset: ViewPreset) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
  };

  const handleSaveEdit = (presetId: string) => {
    if (editingName.trim()) {
      updatePreset(presetId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <ConfirmationModal
      isOpen={confirmation.isOpen}
      onClose={closeConfirmation}
      onConfirm={confirmation.onConfirm}
      title={confirmation.title}
      message={confirmation.message}
      isDanger={confirmation.isDanger}
    />
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          onClick={onClose}
          className="fixed inset-0 liquid-glass-modal"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        />

        <motion.div
          className="relative liquid-glass-modal-content rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-[#27272a]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#f4f4f5]">View Presets</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
                aria-label="Close view presets modal"
                title="Close view presets modal"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Save Current View */}
            <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-4">
              <h3 className="text-sm font-semibold text-[#f4f4f5] mb-3">Save Current View</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  placeholder="Enter preset name..."
                  className={`flex-1 ${formInputClass}`}
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim() || isSaving}
                  className={formPrimaryBtnClass}
                >
                  Save
                </button>
              </div>
            </div>

            {/* Existing Presets */}
            <div>
              <h3 className="text-sm font-semibold text-[#f4f4f5] mb-3">Saved Presets</h3>
              {presets.length === 0 ? (
                <p className="text-center text-[#a1a1aa] py-8">No presets saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {presets.map(preset => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#27272a] bg-[#18181b] hover:bg-[#27272a]"
                    >
                      {editingId === preset.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(preset.id);
                              if (e.key === 'Escape') {
                                // Cancel inline rename instead of closing the modal.
                                e.stopPropagation();
                                setEditingId(null);
                                setEditingName('');
                              }
                            }}
                            className={`flex-1 ${formInputSmClass}`}
                            autoFocus
                            aria-label={`Edit preset name for "${preset.name}"`}
                            title={`Edit preset name for "${preset.name}"`}
                          />
                          <button
                            onClick={() => handleSaveEdit(preset.id)}
                            className="p-1 rounded text-[#86efac] hover:bg-green-500/10 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
                            aria-label={`Save changes to preset "${preset.name}"`}
                            title={`Save changes to preset "${preset.name}"`}
                          >
                            <MaterialIcon name="check" className="text-lg" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingName('');
                            }}
                            className="p-1 rounded text-[#a1a1aa] hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
                            aria-label={`Cancel editing preset "${preset.name}"`}
                            title={`Cancel editing preset "${preset.name}"`}
                          >
                            <MaterialIcon name="close" className="text-lg" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-medium text-[#f4f4f5]">{preset.name}</div>
                            <div className="text-xs text-[#a1a1aa]">
                              {new Date(preset.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLoadPreset(preset.id)}
                              className="p-2 rounded text-[#fca5a5] hover:bg-[#dc2626]/10 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
                              title="Load preset"
                              aria-label={`Load preset "${preset.name}"`}
                            >
                              <MaterialIcon name="play_arrow" className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(preset)}
                              className="p-2 rounded text-[#a1a1aa] hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
                              title="Rename preset"
                              aria-label={`Rename preset "${preset.name}"`}
                            >
                              <MaterialIcon name="edit" className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-2 rounded text-[#fca5a5] hover:bg-[#dc2626]/10 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
                              title="Delete preset"
                              aria-label={`Delete preset "${preset.name}"`}
                            >
                              <MaterialIcon name="delete" className="text-lg" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    </>
  );
};

export default ViewPresetModal;
