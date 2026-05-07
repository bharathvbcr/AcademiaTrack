import React, { useMemo, useState } from 'react';
import { Application } from '../types';
import { useDataValidation, ValidationResult } from '../hooks/useDataValidation';

interface DataValidationPanelProps {
  applications: Application[];
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const countIssues = (result: ValidationResult) =>
  result.errors.length + result.warnings.length + result.info.length;

const DataValidationPanel: React.FC<DataValidationPanelProps> = ({ applications }) => {
  const { validateAll, detectDuplicates, getCompletenessStats } = useDataValidation(applications);
  const [expanded, setExpanded] = useState(false);

  const validation = useMemo(() => validateAll(), [validateAll]);
  const duplicates = useMemo(() => detectDuplicates(), [detectDuplicates]);
  const stats = useMemo(() => getCompletenessStats(), [getCompletenessStats]);
  const resultsWithIssues = validation.filter(result => countIssues(result) > 0);
  const hasIssues = resultsWithIssues.length > 0 || duplicates.length > 0;

  if (!applications.length || !hasIssues) {
    return null;
  }

  const appById = new Map(applications.map(app => [app.id, app]));

  return (
    <section className="my-6 rounded-xl border border-[#27272a] bg-[#18181b]/80 p-4 text-[#f4f4f5]">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3">
          <MaterialIcon name="rule" className="text-[#fca5a5]" />
          <div>
            <h2 className="text-base font-semibold">Data Validation</h2>
            <p className="text-sm text-[#a1a1aa]">
              {stats.errorCount} with errors, {stats.warningCount} with warnings, {stats.incompleteCount} incomplete, {duplicates.length} duplicate group{duplicates.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#a1a1aa]">{stats.averageCompleteness}% complete</span>
          <MaterialIcon name={expanded ? 'expand_less' : 'expand_more'} className="text-[#a1a1aa]" />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-[#27272a] pt-4">
          {duplicates.map((group) => (
            <div key={group.map(app => app.id).join('-')} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="font-medium text-amber-200">Possible duplicate applications</div>
              <div className="mt-1 text-sm text-[#f4f4f5]">
                {group.map(app => `${app.universityName} / ${app.programName}`).join(', ')}
              </div>
            </div>
          ))}

          {resultsWithIssues.map((result) => {
            const app = appById.get(result.applicationId);
            if (!app) return null;

            return (
              <div key={result.applicationId} className="rounded-lg border border-[#27272a] bg-[#09090b] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{app.universityName}</div>
                    <div className="text-sm text-[#a1a1aa]">{app.programName}</div>
                  </div>
                  <span className="text-sm text-[#a1a1aa]">{result.completeness}% complete</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {[...result.errors, ...result.warnings, ...result.info].map(issue => (
                    <li key={issue.id} className={issue.severity === 'error' ? 'text-red-300' : 'text-amber-200'}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default DataValidationPanel;
