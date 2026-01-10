import React from 'react';
import { Application, ApplicationStatus, DocumentStatus } from '../../types';
import { STATUS_OPTIONS, STATUS_COLORS, DOCUMENT_LABELS, DOCUMENT_STATUS_COLORS, DOCUMENT_STATUS_OPTIONS } from '../../constants';

interface MaterialIconProps {
    name: string;
    className?: string;
}

const MaterialIcon: React.FC<MaterialIconProps> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

// ============================================================================
// Card Header Component
// ============================================================================

interface CardHeaderProps {
    universityName: string;
    programName: string;
    portalLink?: string;
    logoUrl: string | null;
    status: ApplicationStatus;
    hasUpcomingInterview: boolean;
    onStatusChange: (status: ApplicationStatus) => void;
    sanitizeURL: (url: string) => string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
    universityName,
    programName,
    portalLink,
    logoUrl,
    status,
    hasUpcomingInterview,
    onStatusChange,
    sanitizeURL,
}) => {
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        onStatusChange(e.target.value as ApplicationStatus);
    };

    return (
        <div className="flex justify-between items-start mb-3">
            <div className="flex-1 flex items-start gap-3">
                {logoUrl && (
                    <img
                        src={logoUrl}
                        alt={`${universityName} logo`}
                        className="w-10 h-10 object-contain rounded-md bg-white p-0.5 shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                )}
                <div>
                    {portalLink ? (
                        <a href={sanitizeURL(portalLink)} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{universityName}</h3>
                            <MaterialIcon name="open_in_new" className="text-sm text-slate-400 group-hover:text-red-500" />
                        </a>
                    ) : (
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{universityName}</h3>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-300">{programName}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {hasUpcomingInterview && (
                    <div className="text-red-500 animate-pulse" title="Upcoming Interview">
                        <MaterialIcon name="event_upcoming" className="text-2xl" />
                    </div>
                )}
                <div className="relative" onClick={e => e.stopPropagation()}>
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
        </div>
    );
};

// ============================================================================
// Document Checklist Component
// ============================================================================

interface DocumentChecklistProps {
    documents: Application['documents'];
    onDocumentStatusChange: (docKey: keyof Application['documents'], status: DocumentStatus) => void;
}

export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({
    documents,
    onDocumentStatusChange,
}) => {
    return (
        <div className="grid grid-cols-1 gap-2 text-sm">
            {Object.keys(documents).map(key => {
                const docKey = key as keyof typeof documents;
                const doc = documents[docKey];
                if (!doc.required) return null;

                const handleDocStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                    e.stopPropagation();
                    onDocumentStatusChange(docKey, e.target.value as DocumentStatus);
                };

                return (
                    <div key={key} className="flex items-center justify-between p-1" onClick={e => e.stopPropagation()}>
                        <span className="text-slate-600 dark:text-slate-300 flex-grow">{DOCUMENT_LABELS[docKey]}</span>
                        <div className="flex items-center gap-2">
                            <select
                                value={doc.status}
                                onChange={handleDocStatusChange}
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-offset-0 border-0 ${DOCUMENT_STATUS_COLORS[doc.status]}`}
                                aria-label={`Change ${DOCUMENT_LABELS[docKey]} status`}
                            >
                                {DOCUMENT_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">{opt}</option>)}
                            </select>
                            {doc.submitted && (
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[70px] text-right">
                                    {new Date(doc.submitted + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ============================================================================
// Faculty Outreach Section Component
// ============================================================================

import { FacultyContact, FacultyContactStatus } from '../../types';
import { FACULTY_CHART_COLORS } from '../../constants';

interface FacultyOutreachListProps {
    facultyContacts: FacultyContact[];
}

export const FacultyOutreachList: React.FC<FacultyOutreachListProps> = ({
    facultyContacts,
}) => {
    const filteredContacts = facultyContacts.filter(f => f.name);

    if (filteredContacts.length === 0) return null;

    return (
        <div className="space-y-2">
            {filteredContacts.map(f => (
                <div key={f.id} className="text-sm" title={`${f.name} - ${f.contactStatus}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`truncate ${f.contactStatus === FacultyContactStatus.FollowUpRequired ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
                                {f.name}
                            </span>
                            {f.contactStatus === FacultyContactStatus.FollowUpRequired && (
                                <MaterialIcon name="notification_important" className="text-sm text-cyan-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400">{f.contactStatus}</span>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FACULTY_CHART_COLORS[f.contactStatus] }}></div>
                        </div>
                    </div>
                    {f.interviewDate && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <MaterialIcon name="event" className="text-sm" />
                            <span>Interview: {new Date(f.interviewDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// Card Footer Component
// ============================================================================

interface CardFooterProps {
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const CardFooter: React.FC<CardFooterProps> = ({
    isExpanded,
    onToggleExpand,
    onEdit,
    onDelete,
}) => {
    return (
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
                    onClick={onEdit}
                    className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    aria-label="Edit Application"
                >
                    <MaterialIcon name="edit" className="text-xl" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    aria-label="Delete Application"
                >
                    <MaterialIcon name="delete" className="text-xl" />
                </button>
            </div>
        </div>
    );
};
