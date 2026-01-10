import React, { useState, useMemo } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { EXPORT_FIELDS, EXPORT_PRESETS, ExportConfig, ExportPreset, ExportFieldCategory } from '../types/exportConfig';

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  format: 'csv' | 'json' | 'ics' | 'md' | 'pdf';
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({ isOpen, onClose, onExport, format }) => {
  useLockBodyScroll(isOpen);
  const [savedPresets, setSavedPresets] = useLocalStorage<ExportPreset[]>('export-presets', EXPORT_PRESETS);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(EXPORT_PRESETS[0].fields));
  const [selectedPreset, setSelectedPreset] = useState<string>('all');
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Group fields by category
  const fieldsByCategory = useMemo(() => {
    const grouped: Record<ExportFieldCategory, typeof EXPORT_FIELDS> = {
      basic: [],
      status: [],
      financial: [],
      documents: [],
      faculty: [],
      recommenders: [],
      essays: [],
      custom: [],
      metadata: [],
    };
    EXPORT_FIELDS.forEach(field => {
      grouped[field.category].push(field);
    });
    return grouped;
  }, []);

  const handlePresetSelect = (presetId: string) => {
    const preset = savedPresets.find(p => p.id === presetId);
    if (preset) {
      setSelectedFields(new Set(preset.fields));
      setSelectedPreset(presetId);
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
    setSelectedPreset(''); // Clear preset selection when manually changing
  };

  const handleCategoryToggle = (category: ExportFieldCategory) => {
    const categoryFields = fieldsByCategory[category];
    const allSelected = categoryFields.every(f => selectedFields.has(f.id));
    
    setSelectedFields(prev => {
      const next = new Set(prev);
      categoryFields.forEach(field => {
        if (allSelected) {
          next.delete(field.id);
        } else {
          next.add(field.id);
        }
      });
      return next;
    });
    setSelectedPreset('');
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: ExportPreset = {
      id: crypto.randomUUID(),
      name: presetName,
      description: `Custom export preset with ${selectedFields.size} fields`,
      fields: Array.from(selectedFields),
    };
    
    setSavedPresets(prev => [...prev, newPreset]);
    setPresetName('');
    setShowSavePreset(false);
  };

  const handleExport = () => {
    onExport({
      selectedFields: Array.from(selectedFields),
      includeHeaders: true,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Export Configuration</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select fields to include in {format.toUpperCase()} export
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              aria-label="Close export config modal"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {savedPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPreset === preset.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
              {!showSavePreset && (
                <button
                  onClick={() => setShowSavePreset(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2"
                >
                  <MaterialIcon name="add" className="text-sm" />
                  Save Preset
                </button>
              )}
            </div>
            {showSavePreset && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                  autoFocus
                />
                <button
                  onClick={handleSavePreset}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSavePreset(false);
                    setPresetName('');
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Field Selection by Category */}
          <div className="space-y-4">
            {(Object.keys(fieldsByCategory) as ExportFieldCategory[]).map(category => {
              const fields = fieldsByCategory[category];
              if (fields.length === 0) return null;
              
              const allSelected = fields.every(f => selectedFields.has(f.id));
              const someSelected = fields.some(f => selectedFields.has(f.id));

              return (
                <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => handleCategoryToggle(category)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                        {category === 'basic' ? 'Basic Information' :
                         category === 'status' ? 'Status & Deadlines' :
                         category === 'financial' ? 'Financial' :
                         category === 'documents' ? 'Documents' :
                         category === 'faculty' ? 'Faculty Contacts' :
                         category === 'recommenders' ? 'Recommenders' :
                         category === 'essays' ? 'Essays' :
                         category === 'custom' ? 'Custom Fields' :
                         'Metadata'}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({fields.filter(f => selectedFields.has(f.id)).length}/{fields.length})
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    {fields.map(field => (
                      <label key={field.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedFields.has(field.id)}
                          onChange={() => handleFieldToggle(field.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedFields.size === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No fields selected. Please select at least one field to export.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedFields.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export {format.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportConfigModal;
