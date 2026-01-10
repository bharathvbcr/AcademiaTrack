import React, { useState, useMemo } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Application } from '../types';

interface Conflict {
  existing: Application;
  imported: Application;
  matchKey: string; // How they were matched
}

interface ImportConflictResolverProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  onResolve: (resolutions: Map<string, 'keep' | 'overwrite' | 'merge' | 'skip'>) => void;
}

type Resolution = 'keep' | 'overwrite' | 'merge' | 'skip';

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ImportConflictResolver: React.FC<ImportConflictResolverProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve,
}) => {
  useLockBodyScroll(isOpen);
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(
    new Map(conflicts.map(c => [c.existing.id, 'keep']))
  );
  const [bulkAction, setBulkAction] = useState<Resolution | null>(null);

  const handleResolutionChange = (conflictId: string, resolution: Resolution) => {
    setResolutions(prev => {
      const next = new Map(prev);
      next.set(conflictId, resolution);
      return next;
    });
  };

  const handleBulkAction = () => {
    if (!bulkAction) return;
    setResolutions(prev => {
      const next = new Map(prev);
      conflicts.forEach(c => {
        next.set(c.existing.id, bulkAction);
      });
      return next;
    });
  };

  const handleApply = () => {
    onResolve(resolutions);
    onClose();
  };

  const getFieldDiff = (existing: Application, imported: Application) => {
    const diffs: Array<{ field: string; existing: any; imported: any }> = [];
    const fieldsToCheck: Array<keyof Application> = [
      'universityName', 'programName', 'status', 'deadline', 'applicationFee',
      'department', 'location', 'admissionTerm', 'admissionYear'
    ];

    fieldsToCheck.forEach(field => {
      const existingVal = existing[field];
      const importedVal = imported[field];
      if (JSON.stringify(existingVal) !== JSON.stringify(importedVal)) {
        diffs.push({ field, existing: existingVal, imported: importedVal });
      }
    });

    return diffs;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Import Conflict Resolution</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found. Choose how to resolve each one.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              aria-label="Close conflict resolver"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Apply to all:</span>
            <select
              value={bulkAction || ''}
              onChange={(e) => setBulkAction(e.target.value as Resolution || null)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
              aria-label="Bulk action for all conflicts"
              title="Bulk action for all conflicts"
            >
              <option value="">Select action...</option>
              <option value="keep">Keep all existing</option>
              <option value="overwrite">Overwrite all</option>
              <option value="merge">Merge all</option>
              <option value="skip">Skip all</option>
            </select>
            {bulkAction && (
              <button
                onClick={handleBulkAction}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Apply
              </button>
            )}
          </div>
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conflicts.map((conflict, index) => {
            const resolution = resolutions.get(conflict.existing.id) || 'keep';
            const diffs = getFieldDiff(conflict.existing, conflict.imported);

            return (
              <div
                key={conflict.existing.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {conflict.existing.universityName} - {conflict.existing.programName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Matched by: {conflict.matchKey}
                    </p>
                  </div>
                  <label className="sr-only">Resolution for {conflict.existing.universityName}</label>
                  <select
                    value={resolution}
                    onChange={(e) => handleResolutionChange(conflict.existing.id, e.target.value as Resolution)}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                    aria-label={`Resolution for ${conflict.existing.universityName}`}
                    title={`Resolution for ${conflict.existing.universityName}`}
                  >
                    <option value="keep">Keep Existing</option>
                    <option value="overwrite">Overwrite</option>
                    <option value="merge">Merge</option>
                    <option value="skip">Skip</option>
                  </select>
                </div>

                {diffs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Differences:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {diffs.slice(0, 5).map((diff, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-2 rounded">
                          <div className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {diff.field.replace(/([A-Z])/g, ' $1').trim()}:
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            <span className="line-through text-red-500">{String(diff.existing || 'N/A')}</span>
                            {' → '}
                            <span className="text-green-600 dark:text-green-400">{String(diff.imported || 'N/A')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {diffs.length > 5 && (
                      <p className="text-xs text-slate-500">+ {diffs.length - 5} more differences</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {Array.from(resolutions.values()).filter(r => r !== 'keep').length} of {conflicts.length} will be modified
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Resolutions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportConflictResolver;
