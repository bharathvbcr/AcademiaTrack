import React, { useState, useEffect } from 'react';
import { useEnhancedKeyboardShortcuts, KeyboardShortcut } from '../hooks/useEnhancedKeyboardShortcuts';
import { useViewState } from '../hooks/useViewState';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useCustomFields } from '../hooks/useCustomFields';
import { useCustomStatuses, CustomStatus } from '../hooks/useCustomStatuses';
import { useViewPresets } from '../hooks/useViewPresets';
import { CustomFieldDefinition } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcutAction?: (action: string) => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onShortcutAction }) => {
  useLockBodyScroll(isOpen);
  const { shortcuts, updateShortcut, resetShortcuts, enabled, setEnabled } = useEnhancedKeyboardShortcuts({});
  const [viewDensity, setViewDensity] = useLocalStorage<'compact' | 'comfortable' | 'spacious'>('view-density', 'comfortable');
  const viewPresets = useViewPresets();

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [fontSize, setFontSize] = useLocalStorage<'small' | 'medium' | 'large'>('font-size', 'medium');

  // Custom Fields
  const { customFields, addField, updateField, deleteField } = useCustomFields();
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'views' | 'general' | 'fields' | 'statuses' | 'workflows'>('shortcuts');
  const [isAddingField, setIsAddingField] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomFieldDefinition>>({ type: 'text' });

  // Custom Statuses
  const {
    allStatuses,
    customStatuses,
    hiddenStatusIds,
    addStatus,
    deleteStatus,
    showStatus,
  } = useCustomStatuses();
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<Partial<CustomStatus>>({
    name: '',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    category: 'custom',
    order: allStatuses.length,
  });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="./AcademiaTrack.png" alt="AcademiaTrack" className="w-8 h-8 object-contain" />
              <h2 className="text-2xl font-bold">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              aria-label="Close settings modal"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {(['shortcuts', 'views', 'general', 'fields', 'statuses', 'workflows'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm capitalize transition-colors ${activeTab === tab
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                  className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
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
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map(shortcut => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{shortcut.description}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{shortcut.action}</div>
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
                              <kbd className="px-2 py-1 text-xs font-semibold bg-slate-200 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600">
                                {shortcut.keys}
                              </kbd>
                              <button
                                onClick={() => setEditingShortcut(shortcut.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                aria-label={`Edit keyboard shortcut for ${shortcut.description}`}
                              >
                                <MaterialIcon name="edit" className="text-sm" />
                              </button>
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
            <div className="space-y-6">
              <div>
                <label htmlFor="font-size-select" className="block text-sm font-medium mb-2">Font Size</label>
                <select
                  id="font-size-select"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="w-full px-4 py-2 border rounded-lg"
                  aria-label="Font size"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label htmlFor="view-density-select" className="block text-sm font-medium mb-2">View Density</label>
                <select
                  id="view-density-select"
                  value={viewDensity}
                  onChange={(e) => setViewDensity(e.target.value as any)}
                  className="w-full px-4 py-2 border rounded-lg"
                  aria-label="View density"
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>

              {/* View Presets Management */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">View Presets</h3>
                </div>
                <div className="space-y-2">
                  {viewPresets.presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        {preset.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{preset.description}</div>
                        )}
                        {preset.sortConfig && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Sort: {preset.sortConfig.key} ({preset.sortConfig.direction})
                          </div>
                        )}
                      </div>
                      {!['all', 'basic', 'financial'].includes(preset.id) && (
                        <button
                          onClick={() => viewPresets.deletePreset(preset.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          aria-label={`Delete view preset ${preset.name}`}
                        >
                          <MaterialIcon name="delete" className="text-sm" />
                        </button>
                      )}
                    </div>
                  ))}
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
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
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
                      onChange={e => setNewField({ ...newField, type: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      aria-label="Field type"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Checkbox (Yes/No)</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
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
                {customFields.map(field => (
                  <div key={field.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div>
                      <div className="font-medium">{field.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{field.type}</div>
                    </div>
                    <button
                      onClick={() => deleteField(field.id)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      aria-label={`Delete custom field ${field.name}`}
                    >
                      <MaterialIcon name="delete" className="text-lg" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Workflow Automation</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  Automate actions based on triggers like status changes, deadlines, and document submissions.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    // Open workflow rules modal via global function
                    setTimeout(() => {
                      if ((window as any).openWorkflowRules) {
                        (window as any).openWorkflowRules();
                      }
                    }, 100);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Manage Workflow Rules
                </button>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Quick Examples</h3>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>• When status changes to "Submitted", create a reminder to follow up in 2 weeks</p>
                  <p>• When deadline is 7 days away, send a notification</p>
                  <p>• When CV is submitted, automatically add "Documents In Progress" tag</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statuses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Custom Statuses</h3>
                <button
                  onClick={() => setIsAddingStatus(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <MaterialIcon name="add" className="text-sm" />
                  Add Status
                </button>
              </div>

              {isAddingStatus && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Status Name</label>
                    <input
                      type="text"
                      value={newStatus.name || ''}
                      onChange={e => setNewStatus({ ...newStatus, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g., Interview Prep"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Blue', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                        { name: 'Green', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                        { name: 'Yellow', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
                        { name: 'Red', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                        { name: 'Purple', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
                        { name: 'Indigo', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
                        { name: 'Orange', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                        { name: 'Pink', class: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
                      ].map(color => (
                        <button
                          key={color.name}
                          onClick={() => setNewStatus({ ...newStatus, color: color.class })}
                          className={`px-3 py-2 rounded-lg text-xs font-medium ${color.class} ${newStatus.color === color.class ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setIsAddingStatus(false);
                        setNewStatus({ name: '', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', category: 'custom', order: allStatuses.length });
                      }}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (newStatus.name) {
                          addStatus(newStatus as Omit<CustomStatus, 'id' | 'createdAt'>);
                          setNewStatus({ name: '', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', category: 'custom', order: allStatuses.length });
                          setIsAddingStatus(false);
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
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Default Statuses</h4>
                {allStatuses.filter(s => customStatuses.every(cs => cs.id !== s.id)).map(status => (
                  <div key={status.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.name}
                      </span>
                      {hiddenStatusIds.includes(status.id) && (
                        <span className="text-xs text-slate-400">(Hidden)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {hiddenStatusIds.includes(status.id) ? (
                        <button
                          onClick={() => showStatus(status.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Show status"
                        >
                          <MaterialIcon name="visibility" className="text-sm" />
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteStatus(status.id)}
                          className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                          title="Hide status"
                        >
                          <MaterialIcon name="visibility_off" className="text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {customStatuses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Custom Statuses</h4>
                  {customStatuses.map(status => (
                    <div key={status.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.name}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteStatus(status.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete status"
                      >
                        <MaterialIcon name="delete" className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {customStatuses.length === 0 && !isAddingStatus && (
                <p className="text-center text-slate-500 py-8">No custom statuses defined. Add one to customize your workflow.</p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
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
