import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Application } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { MaterialIcon, formInputSmClass, formSecondaryBtnClass, formPrimaryBtnClass, formIconBtnClass, formMutedTextClass, formCheckboxClass } from './ApplicationFormUI';

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  onExport: (format: 'csv' | 'markdown' | 'pdf' | 'json', selectedFields: string[]) => void;
}

// Available export fields with categories
const EXPORT_FIELDS = [
  { id: 'universityName', label: 'University Name', category: 'Basic', defaultSelected: true },
  { id: 'programName', label: 'Program Name', category: 'Basic', defaultSelected: true },
  { id: 'programType', label: 'Program Type', category: 'Basic', defaultSelected: true },
  { id: 'department', label: 'Department', category: 'Basic', defaultSelected: true },
  { id: 'location', label: 'Location', category: 'Basic', defaultSelected: true },
  { id: 'status', label: 'Status', category: 'Basic', defaultSelected: true },
  { id: 'deadline', label: 'Deadline', category: 'Timeline', defaultSelected: true },
  { id: 'preferredDeadline', label: 'Preferred Deadline', category: 'Timeline', defaultSelected: false },
  { id: 'decisionDeadline', label: 'Decision Deadline', category: 'Timeline', defaultSelected: false },
  { id: 'admissionTerm', label: 'Admission Term', category: 'Timeline', defaultSelected: false },
  { id: 'admissionYear', label: 'Admission Year', category: 'Timeline', defaultSelected: false },
  { id: 'applicationFee', label: 'Application Fee', category: 'Financial', defaultSelected: true },
  { id: 'feeWaiverStatus', label: 'Fee Waiver Status', category: 'Financial', defaultSelected: false },
  { id: 'universityRanking', label: 'University Ranking', category: 'Rankings', defaultSelected: false },
  { id: 'departmentRanking', label: 'Department Ranking', category: 'Rankings', defaultSelected: false },
  { id: 'isR1', label: 'Is R1', category: 'Rankings', defaultSelected: false },
  { id: 'admissionChance', label: 'Admission Chance', category: 'Assessment', defaultSelected: false },
  { id: 'tags', label: 'Tags', category: 'Metadata', defaultSelected: true },
  { id: 'portalLink', label: 'Portal Link', category: 'Links', defaultSelected: false },
  { id: 'notes', label: 'Notes', category: 'Additional', defaultSelected: false },
  { id: 'cv', label: 'CV Status', category: 'Documents', defaultSelected: false },
  { id: 'statementOfPurpose', label: 'SOP Status', category: 'Documents', defaultSelected: false },
  { id: 'transcripts', label: 'Transcripts Status', category: 'Documents', defaultSelected: false },
  { id: 'lor1', label: 'LOR 1 Status', category: 'Documents', defaultSelected: false },
  { id: 'lor2', label: 'LOR 2 Status', category: 'Documents', defaultSelected: false },
  { id: 'lor3', label: 'LOR 3 Status', category: 'Documents', defaultSelected: false },
  { id: 'writingSample', label: 'Writing Sample Status', category: 'Documents', defaultSelected: false },
  { id: 'greStatus', label: 'GRE Status', category: 'Tests', defaultSelected: false },
  { id: 'englishTestType', label: 'English Test Type', category: 'Tests', defaultSelected: false },
  { id: 'englishTestStatus', label: 'English Test Status', category: 'Tests', defaultSelected: false },
  { id: 'facultyContacts', label: 'Faculty Contacts', category: 'Contacts', defaultSelected: false },
  { id: 'recommenders', label: 'Recommenders', category: 'Contacts', defaultSelected: false },
  { id: 'preferredFaculty', label: 'Preferred Faculty', category: 'Contacts', defaultSelected: false },
];

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({ isOpen, onClose, applications, onExport }) => {
  useLockBodyScroll(isOpen);
  useEscapeKey(isOpen, onClose);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.filter(f => f.defaultSelected).map(f => f.id)
  );
  const [exportFormat, setExportFormat] = useState<'csv' | 'markdown' | 'pdf' | 'json'>('csv');
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useLocalStorage<Array<{ name: string; fields: string[] }>>('export-presets', []);

  const fieldsByCategory = useMemo(() => {
    const categories: Record<string, typeof EXPORT_FIELDS> = {};
    EXPORT_FIELDS.forEach(field => {
      if (!categories[field.category]) {
        categories[field.category] = [];
      }
      categories[field.category].push(field);
    });
    return categories;
  }, []);

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectCategory = (category: string, select: boolean) => {
    const categoryFields = fieldsByCategory[category].map(f => f.id);
    setSelectedFields(prev => {
      if (select) {
        return [...new Set([...prev, ...categoryFields])];
      } else {
        return prev.filter(id => !categoryFields.includes(id));
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedFields(EXPORT_FIELDS.map(f => f.id));
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    setSavedPresets(prev => [...prev, { name: presetName.trim(), fields: selectedFields }]);
    setPresetName('');
  };

  const handleLoadPreset = (preset: { name: string; fields: string[] }) => {
    setSelectedFields(preset.fields);
  };

  const handleDeletePreset = (index: number) => {
    setSavedPresets(prev => prev.filter((_, i) => i !== index));
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field to export.');
      return;
    }
    onExport(exportFormat, selectedFields);
    onClose();
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
          className="relative liquid-glass-modal-content rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-[#27272a]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#f4f4f5]">Export Configuration</h2>
              <button
                onClick={onClose}
                className={formIconBtnClass}
                aria-label="Close export configuration modal"
                title="Close"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
            <p className={`text-sm ${formMutedTextClass} mt-2`}>
              Exporting {applications.length} application{applications.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-[#a1a1aa] mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['csv', 'markdown', 'pdf', 'json'] as const).map(format => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      exportFormat === format
                        ? 'border-[#dc2626] bg-[#dc2626]/10 text-[#fca5a5]'
                        : 'border-[#27272a] hover:border-[#3f3f46] text-[#a1a1aa]'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-[#a1a1aa]">
                  Select Fields to Export
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className={`${formSecondaryBtnClass} px-2 py-1 text-xs`}
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className={`${formSecondaryBtnClass} px-2 py-1 text-xs`}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(fieldsByCategory).map(([category, fields]) => {
                  const allSelected = fields.every(f => selectedFields.includes(f.id));
                  const someSelected = fields.some(f => selectedFields.includes(f.id));

                  return (
                    <div key={category} className="border border-[#27272a] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[#f4f4f5]">{category}</h3>
                        <button
                          onClick={() => handleSelectCategory(category, !allSelected)}
                          className={`${formSecondaryBtnClass} px-2 py-1 text-xs`}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {fields.map(field => (
                          <label
                            key={field.id}
                            className="flex items-center gap-2 p-2 hover:bg-[#27272a]/50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFields.includes(field.id)}
                              onChange={() => handleToggleField(field.id)}
                              className={formCheckboxClass}
                            />
                            <span className="text-sm text-[#a1a1aa]">{field.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Presets */}
            {savedPresets.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-[#a1a1aa] mb-2">
                  Saved Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {savedPresets.map((preset, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-lg"
                    >
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="text-sm text-[#dc2626] hover:underline"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => handleDeletePreset(index)}
                        className="text-red-400 hover:text-red-300"
                        aria-label={`Delete preset ${preset.name}`}
                        title="Delete preset"
                      >
                        <MaterialIcon name="close" className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Preset */}
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Save current selection as preset..."
                className={`${formInputSmClass} flex-1`}
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-[#27272a] text-[#f4f4f5] rounded-lg hover:bg-[#3f3f46] disabled:opacity-50"
              >
                Save Preset
              </button>
            </div>
          </div>

          <div className="p-6 border-t border-[#27272a] flex justify-end gap-2">
            <button
              onClick={onClose}
              className={formSecondaryBtnClass}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedFields.length === 0}
              className={`${formPrimaryBtnClass} disabled:opacity-50`}
            >
              Export ({selectedFields.length} fields)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExportConfigModal;
