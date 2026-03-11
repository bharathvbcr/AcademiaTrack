import React, { useState } from 'react';
import Tooltip from './Tooltip';
import { useEnhancedKeyboardShortcuts, KeyboardShortcut } from '../hooks/useEnhancedKeyboardShortcuts';
import { useViewState } from '../hooks/useViewState';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useCustomFields } from '../hooks/useCustomFields';
import { CustomFieldDefinition } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKanbanConfig?: () => void;
  onOpenAutomationRules?: () => void;
  onOpenViewPresets?: () => void;
  initialTab?: 'shortcuts' | 'views' | 'general' | 'fields' | 'kanban' | 'automation';
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenKanbanConfig,
  onOpenAutomationRules,
  onOpenViewPresets,
  initialTab,
}) => {
  useLockBodyScroll(isOpen);
  const { shortcuts, updateShortcut, resetShortcuts, enabled, setEnabled } = useEnhancedKeyboardShortcuts({}, { listen: false });
  const [viewDensity, setViewDensity] = useLocalStorage<'compact' | 'comfortable' | 'spacious'>('view-density', 'comfortable');

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [fontSize, setFontSize] = useLocalStorage<'small' | 'medium' | 'large'>('font-size', 'medium');

  // Custom Fields
  const { customFields, addField, updateField, deleteField, reorderFields, toggleFieldVisibility } = useCustomFields();
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'views' | 'general' | 'fields' | 'kanban' | 'automation'>(initialTab ?? 'shortcuts');
  const [isAddingField, setIsAddingField] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomFieldDefinition>>({ type: 'text', visible: true });

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  if (!isOpen) return null;

  const handleKeyCapture = (shortcutId: string, event: React.KeyboardEvent) => {
    event.preventDefault();
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.metaKey) parts.push('Cmd');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    parts.push(event.key);
    const keyString = parts.join('+');
    updateShortcut(shortcutId, keyString);
    setEditingShortcut(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center liquid-glass-modal">
      <div className="liquid-glass-modal-content rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#27272a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="./AcademiaTrack.png" alt="AcademiaTrack" className="w-8 h-8 object-contain" />
              <h2 className="text-2xl font-bold text-[#f4f4f5]">Settings</h2>
            </div>
            <Tooltip content="Close Settings">
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#27272a] rounded-lg text-[#a1a1aa]"
                aria-label="Close settings modal"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#27272a] overflow-x-auto">
          {(['shortcuts', 'views', 'general', 'fields', 'kanban', 'automation'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm capitalize transition-colors ${activeTab === tab
                ? 'text-[#dc2626] border-b-2 border-[#dc2626]'
                : 'text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Enable Keyboard Shortcuts</span>
                  </label>
                </div>
                <button
                  onClick={resetShortcuts}
                  className="px-3 py-1.5 text-sm border border-[#27272a] rounded-lg hover:bg-[#27272a] text-[#a1a1aa] bg-[#18181b]"
                >
                  Reset to Defaults
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(
                  shortcuts.reduce((acc, s) => {
                    if (!acc[s.category]) acc[s.category] = [];
                    acc[s.category].push(s);
                    return acc;
                  }, {} as Record<string, KeyboardShortcut[]>)
                ).map(([category, categoryShortcuts]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase mb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                          {categoryShortcuts.map(shortcut => (
                            <div
                              key={shortcut.id}
                              className="flex items-center justify-between p-3 bg-[#18181b] rounded-lg border border-[#27272a]"
                            >
                              <div className="flex-1">
                                <div className="font-medium">{shortcut.description}</div>
                                <div className="text-xs text-[#a1a1aa]">{shortcut.commandId}</div>
                              </div>
                          {editingShortcut === shortcut.id ? (
                            <input
                              type="text"
                              autoFocus
                              onKeyDown={(e) => handleKeyCapture(shortcut.id, e)}
                              onBlur={() => setEditingShortcut(null)}
                              className="px-3 py-1.5 border rounded-lg w-32 text-sm"
                              placeholder="Press keys..."
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <kbd className="px-2 py-1 text-xs font-semibold bg-[#27272a] rounded border border-[#27272a] text-[#a1a1aa]">
                                {shortcut.keys}
                              </kbd>
                              <Tooltip content="Edit Shortcut">
                                <button
                                  onClick={() => setEditingShortcut(shortcut.id)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                  aria-label={`Edit keyboard shortcut for ${shortcut.description}`}
                                >
                                  <MaterialIcon name="edit" className="text-sm" />
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'views' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#f4f4f5] mb-4">View Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">View Density</label>
                    <select
                      value={viewDensity}
                      onChange={(e) => setViewDensity(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg"
                      aria-label="View Density"
                      title="View Density"
                    >
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                      <option value="spacious">Spacious</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Font Size</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg"
                      aria-label="Font Size"
                      title="Font Size"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenViewPresets?.();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Manage View Presets
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4" />
                    <span>Auto-save changes</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4" />
                    <span>Show notifications for deadlines</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4" />
                    <span>Enable analytics tracking</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Custom Fields</h3>
                <button
                  onClick={() => setIsAddingField(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <MaterialIcon name="add" className="text-sm" />
                  Add Field
                </button>
              </div>

              {isAddingField && (
                <div className="p-4 bg-[#18181b] rounded-lg border border-[#27272a] space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Field Name</label>
                    <input
                      type="text"
                      value={newField.name || ''}
                      onChange={e => setNewField({ ...newField, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g., Interview Date"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={newField.type}
                      onChange={e => setNewField({ ...newField, type: e.target.value as any, calculatedFormula: e.target.value === 'calculated' ? '' : undefined })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      aria-label="Field Type"
                      title="Field Type"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Checkbox (Yes/No)</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="calculated">Calculated</option>
                    </select>
                  </div>
                  {newField.type === 'select' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Options (comma separated)</label>
                      <input
                        type="text"
                        value={newField.options?.join(', ') || ''}
                        onChange={e => setNewField({ ...newField, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Option 1, Option 2"
                      />
                    </div>
                  )}
                  {newField.type === 'calculated' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Formula</label>
                      <select
                        value={newField.calculatedFormula || ''}
                        onChange={e => setNewField({ ...newField, calculatedFormula: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        aria-label="Calculated Field Formula"
                        title="Calculated Field Formula"
                      >
                        <option value="">Select formula...</option>
                        <option value="deadline - days">Days Until Deadline</option>
                        <option value="submitted - days">Days Since Submitted</option>
                        <option value="fee * 0.1">10% of Application Fee</option>
                        <option value="total cost">Total Cost (Fee + Tests)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Calculated fields are read-only and update automatically</p>
                    </div>
                  )}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newField.required || false}
                        onChange={e => setNewField({ ...newField, required: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Required field</span>
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsAddingField(false)}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (newField.name) {
                          addField(newField as CustomFieldDefinition);
                          setNewField({ type: 'text' });
                          setIsAddingField(false);
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {customFields.length === 0 && !isAddingField && (
                  <p className="text-center text-slate-500 py-8">No custom fields defined.</p>
                )}
                {customFields
                  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                  .map((field, index) => (
                    <div key={field.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex flex-col gap-1">
                          <Tooltip content="Move Up">
                            <button
                              onClick={() => {
                                const newOrder = [...customFields].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                                if (index > 0) {
                                  [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                  reorderFields(newOrder.map(f => f.id));
                                }
                              }}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <MaterialIcon name="arrow_upward" className="text-sm" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Move Down">
                            <button
                              onClick={() => {
                                const newOrder = [...customFields].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                                if (index < newOrder.length - 1) {
                                  [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                  reorderFields(newOrder.map(f => f.id));
                                }
                              }}
                              disabled={index === customFields.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <MaterialIcon name="arrow_downward" className="text-sm" />
                            </button>
                          </Tooltip>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            {field.name}
                            {field.type === 'calculated' && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">(Calculated)</span>
                            )}
                            {field.required && <span className="text-red-500 text-xs">*</span>}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">{field.type}</div>
                        </div>
                        <Tooltip content={field.visible !== false ? 'Hide Field' : 'Show Field'}>
                          <button
                            onClick={() => toggleFieldVisibility(field.id)}
                            className={`p-2 rounded ${field.visible !== false ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                          >
                            <MaterialIcon name={field.visible !== false ? 'visibility' : 'visibility_off'} className="text-lg" />
                          </button>
                        </Tooltip>
                      </div>
                      <Tooltip content="Delete Field">
                        <button
                          onClick={() => deleteField(field.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-2"
                          aria-label="Delete field"
                        >
                          <MaterialIcon name="delete" className="text-lg" />
                        </button>
                      </Tooltip>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Kanban Configuration</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Customize your Kanban board columns and statuses.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenKanbanConfig?.();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Configure Kanban Board
              </button>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Workflow Automation</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create rules to automate actions based on triggers.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAutomationRules?.();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Manage Automation Rules
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#27272a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
