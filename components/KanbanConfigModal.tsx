import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useKanbanConfig, KanbanStatusConfig } from '../hooks/useKanbanConfig';
import { ApplicationStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { useConfirmation } from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import { MaterialIcon, formPrimaryBtnClass, formSecondaryBtnClass, formInputSmClass, formIconBtnClass, formDashedAddClass, formMutedTextClass, formCardClass } from './ApplicationFormUI';

interface KanbanConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { name: 'Slate', value: 'bg-[#27272a] text-[#a1a1aa] border-[#3f3f46]' },
  { name: 'Blue', value: 'bg-blue-500/20 text-blue-200 border-blue-500/30' },
  { name: 'Green', value: 'bg-green-500/20 text-green-200 border-green-500/30' },
  { name: 'Red', value: 'bg-red-500/20 text-red-200 border-red-500/30' },
  { name: 'Yellow', value: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30' },
  { name: 'Purple', value: 'bg-purple-500/20 text-purple-200 border-purple-500/30' },
  { name: 'Indigo', value: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30' },
  { name: 'Pink', value: 'bg-pink-500/20 text-pink-200 border-pink-500/30' },
];

const KanbanConfigModal: React.FC<KanbanConfigModalProps> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  useEscapeKey(isOpen, onClose);
  const { statusConfig, addCustomStatus, updateStatus, deleteStatus, reorderStatuses } = useKanbanConfig();
  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(COLOR_PRESETS[0].value);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const handleAddStatus = () => {
    if (!newStatusName.trim()) return;
    addCustomStatus(newStatusName.trim(), newStatusColor);
    setNewStatusName('');
    setNewStatusColor(COLOR_PRESETS[0].value);
    setIsAddingStatus(false);
  };

  const handleStartEdit = (status: KanbanStatusConfig) => {
    setEditingId(status.id);
    setEditingName(status.name);
    setEditingColor(status.color);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      updateStatus(id, { name: editingName.trim(), color: editingColor });
      setEditingId(null);
      setEditingName('');
      setEditingColor('');
    }
  };

  const handleMoveStatus = (id: string, direction: 'up' | 'down') => {
    const currentOrder = [...statusConfig].sort((a, b) => a.order - b.order);
    const index = currentOrder.findIndex(s => s.id === id);
    if (index === -1) return;

    const newOrder = [...currentOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    reorderStatuses(newOrder.map(s => s.id));
  };

  if (!isOpen) return null;

  const sortedStatuses = [...statusConfig].sort((a, b) => a.order - b.order);

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
          className="relative liquid-glass-modal-content rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-[#27272a]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#f4f4f5]">Kanban Status Configuration</h2>
              <button
                onClick={onClose}
                className={formIconBtnClass}
                aria-label="Close Kanban configuration modal"
                title="Close"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
            <p className={`text-sm ${formMutedTextClass} mt-2`}>
              Customize your Kanban board columns and their order
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Add New Status */}
            {!isAddingStatus ? (
              <button
                onClick={() => setIsAddingStatus(true)}
                className={formDashedAddClass}
              >
                <MaterialIcon name="add" className="inline mr-2" />
                Add Custom Status
              </button>
            ) : (
              <div className={`p-4 ${formCardClass} space-y-3`}>
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="Status name..."
                  className={formInputSmClass}
                  autoFocus
                  aria-label="New status name"
                />
                <div>
                  <label className="block text-sm font-medium text-[#f4f4f5] mb-2">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => setNewStatusColor(preset.value)}
                        className={`px-3 py-2 rounded-lg border-2 ${
                          newStatusColor === preset.value
                            ? 'border-[#dc2626] ring-2 ring-[#dc2626]/30'
                            : 'border-[#27272a]'
                        } ${preset.value}`}
                        aria-label={`Select ${preset.name} color`}
                        aria-pressed={newStatusColor === preset.value}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAddingStatus(false);
                      setNewStatusName('');
                    }}
                    className={`${formSecondaryBtnClass} px-3 py-1.5 text-sm`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStatus}
                    disabled={!newStatusName.trim()}
                    className={`${formPrimaryBtnClass} px-3 py-1.5 text-sm`}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Status List */}
            <div className="space-y-2">
              {sortedStatuses.map((status, index) => (
                <div
                  key={status.id}
                  className={`flex items-center gap-3 p-3 ${formCardClass} rounded-lg`}
                >
                  <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveStatus(status.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-[#a1a1aa] hover:text-[#f4f4f5] disabled:opacity-30"
                          aria-label={`Move ${status.name} up`}
                          title="Move up"
                        >
                          <MaterialIcon name="arrow_upward" className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleMoveStatus(status.id, 'down')}
                          disabled={index === sortedStatuses.length - 1}
                          className="p-1 text-[#a1a1aa] hover:text-[#f4f4f5] disabled:opacity-30"
                          aria-label={`Move ${status.name} down`}
                          title="Move down"
                        >
                          <MaterialIcon name="arrow_downward" className="text-sm" />
                        </button>
                  </div>

                  {editingId === status.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={`flex-1 ${formInputSmClass}`}
                        aria-label="Edit status name"
                        placeholder="Status name"
                        autoFocus
                      />
                      <select
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                        className={formInputSmClass}
                        aria-label="Select status color"
                        title="Select color"
                      >
                        {COLOR_PRESETS.map(preset => (
                          <option key={preset.name} value={preset.value}>{preset.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveEdit(status.id)}
                        className="p-1 text-green-400 hover:bg-green-500/10 rounded"
                        aria-label={`Save changes to ${status.name}`}
                        title="Save changes"
                      >
                        <MaterialIcon name="check" className="text-lg" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                          setEditingColor('');
                        }}
                        className="p-1 text-[#a1a1aa] hover:bg-[#27272a] rounded"
                        aria-label="Cancel editing"
                        title="Cancel"
                      >
                        <MaterialIcon name="close" className="text-lg" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={`px-3 py-1.5 rounded-lg border ${status.color} flex-1`}>
                        {status.name}
                        {status.isCustom && (
                          <span className="ml-2 text-xs opacity-75">(Custom)</span>
                        )}
                      </div>
                      {status.isCustom && (
                        <>
                          <button
                            onClick={() => handleStartEdit(status)}
                            className={`${formIconBtnClass} p-2`}
                            aria-label={`Edit status ${status.name}`}
                            title="Edit"
                          >
                            <MaterialIcon name="edit" className="text-lg" />
                          </button>
                          <button
                            onClick={() => {
                              showConfirmation('Delete Status', `Delete status "${status.name}"? Applications with this status will need to be reassigned.`, () => deleteStatus(status.id), true);
                            }}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                            aria-label={`Delete status ${status.name}`}
                            title="Delete"
                          >
                            <MaterialIcon name="delete" className="text-lg" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-[#27272a] flex justify-end">
            <button
              onClick={onClose}
              className={formPrimaryBtnClass}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    </>
  );
};

export default KanbanConfigModal;
