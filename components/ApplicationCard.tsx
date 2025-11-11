import React, { useEffect } from 'react';
import { Application, ApplicationStatus, ProgramType } from '../types';
import { STATUS_OPTIONS, FEE_WAIVER_STATUS_COLORS, TEST_STATUS_COLORS, FACULTY_CHART_COLORS, DOCUMENT_LABELS, STATUS_COLORS } from '../constants';

interface ApplicationCardProps {
  application: Application;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onUpdate: (app: Application) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, onEdit, onDelete, onUpdate, isExpanded, onToggleExpand }) => {
  useEffect(() => {
    window.performance.mark('my-mark');
  }, []);
  const { id, universityName, programName, deadline, status, portalLink } = application;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = deadline ? new Date(deadline + 'T00:00:00') : null;
  const isPastDeadline = deadlineDate ? today > deadlineDate : false;

  const timeDiff = deadlineDate ? deadlineDate.getTime() - today.getTime() : 0;
  const daysRemaining = deadlineDate ? Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) : 0;
  
  let timeLeftText: string;
  let timeLeftColor: string;

  if (!deadlineDate) {
    timeLeftText = "No deadline set";
    timeLeftColor = 'text-slate-500 dark:text-slate-400';
  } else if (isPastDeadline) {
    timeLeftText = "Deadline Passed";
    timeLeftColor = 'text-slate-500 dark:text-slate-400';
  } else if (daysRemaining === 0) {
    timeLeftText = "Due Today";
    timeLeftColor = 'text-red-600 dark:text-red-400';
  } else if (daysRemaining <= 7) {
    timeLeftText = `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left`;
    timeLeftColor = 'text-red-600 dark:text-red-400';
  } else if (daysRemaining <= 30) {
    timeLeftText = `${daysRemaining} days left`;
    timeLeftColor = 'text-amber-600 dark:text-amber-400';
  } else {
    timeLeftText = `${daysRemaining} days left`;
    timeLeftColor = 'text-green-600 dark:text-green-400';
  }
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ ...application, status: e.target.value as ApplicationStatus });
  };
  
  const programTypeValue = application.programType === ProgramType.Other
    ? application.customProgramType || 'Other'
    : application.programType;

  return (
    <div 
        className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        onClick={onToggleExpand}
    >
      <div className="cursor-pointer">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-2">
            {portalLink ? (
              <a href={portalLink} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{universityName}</h3>
                <MaterialIcon name="open_in_new" className="text-sm text-slate-400 group-hover:text-red-500" />
              </a>
            ) : (
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{universityName}</h3>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300">{programName}</p>
          </div>
          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <select
              value={status}
              onChange={handleStatusChange}
              className={`rounded-full pl-3 pr-8 py-1 text-xs font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 focus:ring-red-500 ${STATUS_COLORS[status]}`}
              aria-label="Change application status"
            >
              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white">{opt}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-inherit opacity-70">
                <MaterialIcon name="unfold_more" className="text-sm" />
            </div>
          </div>
        </div>

        {/* Deadline Info */}
        {deadline && status !== ApplicationStatus.Accepted && (
          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50/70 dark:bg-slate-700/50">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <MaterialIcon name="event" className="text-base" />
              {deadlineDate && <span>{deadlineDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
            </div>
            <span className={`font-bold ${timeLeftColor} ${!isPastDeadline && daysRemaining <= 7 ? 'animate-pulse' : ''}`}>
                {timeLeftText}
            </span>
          </div>
        )}

        {/* Expandable Details Section */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-4">
              <DetailsSection title="General Information">
                <InfoRow icon="school" label="Program Type" value={programTypeValue} />
                {application.admissionTerm && application.admissionYear && (
                  <InfoRow icon="calendar_month" label="Admission Intake" value={`${application.admissionTerm} ${application.admissionYear}`} />
                )}
                <InfoRow icon="apartment" label="Department" value={application.department} />
                <InfoRow icon="flag" label="Rankings (U/D)" value={`${application.universityRanking || 'N/A'} / ${application.departmentRanking || 'N/A'}`} />
                <InfoRow icon="confirmation_number" label="Fee Waiver">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${FEE_WAIVER_STATUS_COLORS[application.feeWaiverStatus]}`}>{application.feeWaiverStatus}</span>
                </InfoRow>
              </DetailsSection>
              
              <DetailsSection title="Document Checklist">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {Object.keys(application.documents).map(key => {
                        const docKey = key as keyof typeof application.documents;
                        const doc = application.documents[docKey];
                        if (!doc.required) return null;

                        const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
                            e.stopPropagation();
                            const newSubmittedDate = e.target.checked ? new Date().toISOString().split('T')[0] : null;
                            const updatedDocuments = {
                                ...application.documents,
                                [docKey]: { ...doc, submitted: newSubmittedDate }
                            };
                            onUpdate({ ...application, documents: updatedDocuments });
                        };

                        return (
                            <div key={key} className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                                <label htmlFor={`doc-${id}-${docKey}`} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id={`doc-${id}-${docKey}`}
                                        checked={!!doc.submitted}
                                        onChange={handleToggle}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                    <span className="text-slate-600 dark:text-slate-300">{DOCUMENT_LABELS[docKey]}</span>
                                </label>
                                {doc.submitted && (
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {new Date(doc.submitted + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
              </DetailsSection>

              <DetailsSection title="Standardized Tests">
                  <InfoRow icon="menu_book" label="GRE">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TEST_STATUS_COLORS[application.gre.status]}`}>{application.gre.status}</span>
                  </InfoRow>
                  <InfoRow icon="language" label={application.englishTest.type}>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TEST_STATUS_COLORS[application.englishTest.status]}`}>{application.englishTest.status}</span>
                  </InfoRow>
              </DetailsSection>

              {application.facultyContacts.filter(f => f.name).length > 0 && (
                <DetailsSection title="Faculty Outreach">
                    <div className="space-y-2">
                    {application.facultyContacts.filter(f => f.name).map(f => (
                        <div key={f.id} className="flex items-center justify-between text-sm" title={`${f.name} - ${f.contactStatus}`}>
                            <span className="text-slate-600 dark:text-slate-300 truncate">{f.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 dark:text-slate-400">{f.contactStatus}</span>
                                <div className={`w-2.5 h-2.5 rounded-full`} style={{backgroundColor: FACULTY_CHART_COLORS[f.contactStatus]}}></div>
                            </div>
                        </div>
                    ))}
                    </div>
                </DetailsSection>
              )}
               {application.notes && (
                <DetailsSection title="Notes">
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{application.notes}</p>
                </DetailsSection>
              )}
            </div>
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400 select-none p-2 -m-2 rounded-full hover:bg-red-500/10 transition-colors"
        >
            <span>{isExpanded ? 'Hide' : 'Show'} Details</span>
            <MaterialIcon name="expand_more" className={`transition-transform transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => onEdit(application)}
              className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50"
              aria-label="Edit Application"
            >
              <MaterialIcon name="edit" className="text-xl" />
            </button>
            <button 
              onClick={() => onDelete(id)}
              className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50"
              aria-label="Delete Application"
            >
              <MaterialIcon name="delete" className="text-xl" />
            </button>
        </div>
      </div>
    </div>
  );
};

const DetailsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{title}</h4>
        <div className="space-y-1.5 pl-1 border-l-2 border-slate-200 dark:border-slate-700 ml-1">
          <div className="pl-3">
            {children}
          </div>
        </div>
    </div>
);

const InfoRow: React.FC<{ icon: string; label: string; value?: string; children?: React.ReactNode }> = ({ icon, label, value, children }) => (
    <div className="flex justify-between items-start text-sm">
        <div className="flex items-center gap-2 shrink-0 pr-4">
            <MaterialIcon name={icon} className="text-base text-slate-400 dark:text-slate-500" />
            <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
        </div>
        <div className="text-right">
          {value ? <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span> : children}
        </div>
    </div>
);

export default ApplicationCard;