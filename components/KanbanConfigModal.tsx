import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useKanbanConfig, KanbanStatusConfig } from '../hooks/useKanbanConfig';
import { ApplicationStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

interface KanbanConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const COLOR_PRESETS = [
  { name: 'Slate', value: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600' },
  { name: 'Blue', value: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30' },
  { name: 'Green', value: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30' },
  { name: 'Red', value: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30' },
  { name: 'Yellow', value: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30' },
  { name: 'Purple', value: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30' },
  { name: 'Indigo', value: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30' },
  { name: 'Pink', value: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/20 dark:text-pink-200 dark:border-pink-500/30' },
];

const KanbanConfigModal: React.FC<KanbanConfigModalProps> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  const { statusConfig, addCustomStatus, updateStatus, deleteStatus, reorderStatuses } = useKanbanConfig();
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
          <div className="p-6 border-b border-[#E8B4B8]/30">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#F5D7DA]">Kanban Status Configuration</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[rgba(192,48,80,0.25)] rounded-lg text-[#E8B4B8] hover:text-[#F5D7DA]"
                aria-label="Close Kanban configuration modal"
                title="Close"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
            <p className="text-sm text-[#E8B4B8]/70 mt-2">
              Customize your Kanban board columns and their order
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Add New Status */}
            {!isAddingStatus ? (
              <button
                onClick={() => setIsAddingStatus(true)}
                className="w-full p-3 border-2 border-dashed border-[#E8B4B8]/30 rounded-lg hover:border-[#C03050] text-[#E8B4B8] hover:text-[#C03050] transition-colors"
              >
                <MaterialIcon name="add" className="inline mr-2" />
                Add Custom Status
              </button>
            ) : (
              <div className="p-4 liquid-glass rounded-lg space-y-3">
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="Status name..."
                  className="w-full px-3 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                  autoFocus
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => setNewStatusColor(preset.value)}
                        className={`px-3 py-2 rounded-lg border-2 ${
                          newStatusColor === preset.value
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-slate-300 dark:border-slate-600'
                        } ${preset.value}`}
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
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStatus}
                    disabled={!newStatusName.trim()}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                  className="flex items-center gap-3 p-3 liquid-glass-card rounded-lg"
                >
                  <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveStatus(status.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-[#E8B4B8] hover:text-[#F5D7DA] disabled:opacity-30"
                          title="Move up"
                        >
                          <MaterialIcon name="arrow_upward" className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleMoveStatus(status.id, 'down')}
                          disabled={index === sortedStatuses.length - 1}
                          className="p-1 text-[#E8B4B8] hover:text-[#F5D7DA] disabled:opacity-30"
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
                        className="flex-1 px-2 py-1 border border-[#E8B4B8]/30 rounded text-sm liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                        aria-label="Edit status name"
                        placeholder="Status name"
                        autoFocus
                      />
                      <select
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                        className="px-2 py-1 border border-[#E8B4B8]/30 rounded text-sm liquid-glass text-[#F5D7DA]"
                        aria-label="Select status color"
                        title="Select color"
                      >
                        {COLOR_PRESETS.map(preset => (
                          <option key={preset.name} value={preset.value}>{preset.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveEdit(status.id)}
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
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
                        className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
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
                            className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            title="Edit"
                          >
                            <MaterialIcon name="edit" className="text-lg" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete status "${status.name}"? Applications with this status will need to be reassigned.`)) {
                                deleteStatus(status.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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

          <div className="p-6 border-t border-[#E8B4B8]/30 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#C03050] text-white rounded-lg hover:bg-[#E03030]"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default KanbanConfigModal;
