import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useViewState, ViewPreset, ViewMode } from '../hooks/useViewState';

interface ViewPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  currentState: any; // ViewState from useViewState
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ViewPresetModal: React.FC<ViewPresetModalProps> = ({ isOpen, onClose, viewMode, currentState }) => {
  useLockBodyScroll(isOpen);
  const { savePreset, loadPreset, deletePreset, updatePreset, getPresetsForView } = useViewState(viewMode);
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
    if (window.confirm('Are you sure you want to delete this preset?')) {
      deletePreset(presetId);
    }
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
          <div className="p-6 border-b border-[#E8B4B8]/30">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#F5D7DA]">View Presets</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[rgba(192,48,80,0.25)] rounded-lg text-[#E8B4B8] hover:text-[#F5D7DA]"
                aria-label="Close view presets modal"
                title="Close view presets modal"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Save Current View */}
            <div className="liquid-glass rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#F5D7DA] mb-3">Save Current View</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  placeholder="Enter preset name..."
                  className="flex-1 px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim() || isSaving}
                  className="px-4 py-2 bg-[#C03050] text-white rounded-lg hover:bg-[#E03030] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Existing Presets */}
            <div>
              <h3 className="text-sm font-semibold text-[#F5D7DA] mb-3">Saved Presets</h3>
              {presets.length === 0 ? (
                <p className="text-center text-[#E8B4B8]/70 py-8">No presets saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {presets.map(preset => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 liquid-glass-card rounded-lg hover:bg-[rgba(139,0,0,0.5)]"
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
                                setEditingId(null);
                                setEditingName('');
                              }
                            }}
                            className="flex-1 px-2 py-1 border border-[#E8B4B8]/30 rounded text-sm liquid-glass text-[#F5D7DA]"
                            autoFocus
                            aria-label={`Edit preset name for "${preset.name}"`}
                            title={`Edit preset name for "${preset.name}"`}
                          />
                          <button
                            onClick={() => handleSaveEdit(preset.id)}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
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
                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            aria-label={`Cancel editing preset "${preset.name}"`}
                            title={`Cancel editing preset "${preset.name}"`}
                          >
                            <MaterialIcon name="close" className="text-lg" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-medium text-[#F5D7DA]">{preset.name}</div>
                            <div className="text-xs text-[#E8B4B8]/70">
                              {new Date(preset.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLoadPreset(preset.id)}
                              className="p-2 text-[#C03050] hover:bg-[rgba(192,48,80,0.25)] rounded"
                              title="Load preset"
                            >
                              <MaterialIcon name="play_arrow" className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(preset)}
                              className="p-2 text-[#E8B4B8] hover:bg-[rgba(192,48,80,0.25)] rounded"
                              title="Rename preset"
                            >
                              <MaterialIcon name="edit" className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-2 text-[#E03030] hover:bg-[rgba(224,48,48,0.25)] rounded"
                              title="Delete preset"
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
  );
};

export default ViewPresetModal;
