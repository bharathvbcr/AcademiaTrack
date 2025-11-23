import React, { useEffect, useRef, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { Application, ApplicationStatus, ProgramType, FacultyContactStatus, DocumentStatus } from '../types';
import { STATUS_OPTIONS, FEE_WAIVER_STATUS_COLORS, TEST_STATUS_COLORS, FACULTY_CHART_COLORS, DOCUMENT_LABELS, STATUS_COLORS, DOCUMENT_STATUS_COLORS, DOCUMENT_STATUS_OPTIONS } from '../constants';
import { sanitizeURL } from '../utils';

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

const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, onEdit, onDelete, onUpdate, isExpanded, onToggleExpand }) => {
  const { id, universityName, programName, deadline, status, portalLink } = application;
  const prevStatusRef = useRef<ApplicationStatus>(status);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      const cacheKey = `university_logo_${universityName}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setLogoUrl(cached);
        return;
      }

      try {
        const cleanName = universityName.split('(')[0].trim();
        const response = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(cleanName)}`);
        const data = await response.json();
        
        if (data && data.length > 0 && data[0].domains && data[0].domains.length > 0) {
          const domain = data[0].domains[0];
          const url = `https://logo.clearbit.com/${domain}`;
          setLogoUrl(url);
          localStorage.setItem(cacheKey, url);
        }
      } catch (e) {
        console.error("Failed to fetch logo", e);
      }
    };
    
    if (universityName) fetchLogo();
  }, [universityName]);

  const upcomingInterview = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = application.facultyContacts.find(f => 
      f.contactStatus === FacultyContactStatus.MeetingScheduled && 
      f.interviewDate && 
      new Date(f.interviewDate + 'T00:00:00') >= today
    );
    return scheduled;
  }, [application.facultyContacts]);
  const hasUpcomingInterview = !!upcomingInterview;

  useEffect(() => {
    if (prevStatusRef.current !== ApplicationStatus.Accepted && status === ApplicationStatus.Accepted) {
      // Celebratory burst
      const end = Date.now() + (3 * 1000);
      const colors = ['#FFD700', '#FFA500', '#FF8C00'];

      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
      
      // School pride effect
       setTimeout(() => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#bb0000', '#ffffff']
        });
    }, 500);
    }
    prevStatusRef.current = status;
  }, [status]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = deadline ? new Date(deadline + 'T00:00:00') : null;
  
  const programTypeValue = application.programType === ProgramType.Other
    ? application.customProgramType || 'Other'
    : application.programType;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ ...application, status: e.target.value as ApplicationStatus });
  };

  return (
    <div 
        className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        onClick={onToggleExpand}
    >
      <div className="cursor-pointer">
        {/* Header */}
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

        {/* At-a-glance Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300 mb-4">
          <div className="flex items-center gap-1.5">
            <MaterialIcon name="school" className="text-sm" />
            <span>{programTypeValue}</span>
          </div>
          {application.admissionTerm && application.admissionYear && (
            <div className="flex items-center gap-1.5">
              <MaterialIcon name="calendar_month" className="text-sm" />
              <span>{application.admissionTerm} {application.admissionYear}</span>
            </div>
          )}
          {deadlineDate && (
            <div className="flex items-center gap-1.5">
              <MaterialIcon name="event" className="text-sm" />
              <span>Deadline: {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          {upcomingInterview && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
              <MaterialIcon name="event_upcoming" className="text-sm" />
              <span>Interview: {new Date(upcomingInterview.interviewDate! + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

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
                <div className="grid grid-cols-1 gap-2 text-sm">
                    {Object.keys(application.documents).map(key => {
                        const docKey = key as keyof typeof application.documents;
                        const doc = application.documents[docKey];
                        if (!doc.required) return null;

                        const handleDocStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                            e.stopPropagation();
                            const newStatus = e.target.value as DocumentStatus;
                            const newSubmittedDate = newStatus === DocumentStatus.Submitted 
                                ? new Date().toISOString().split('T')[0] 
                                : null;
                            
                            const updatedDocuments = {
                                ...application.documents,
                                [docKey]: { ...doc, status: newStatus, submitted: newSubmittedDate }
                            };
                            onUpdate({ ...application, documents: updatedDocuments });
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
                        <div key={f.id} className="text-sm" title={`${f.name} - ${f.contactStatus}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`truncate ${f.contactStatus === FacultyContactStatus.FollowUpRequired ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>{f.name}</span>
                                    {f.contactStatus === FacultyContactStatus.FollowUpRequired && (
                                        <MaterialIcon name="notification_important" className="text-sm text-cyan-500" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-slate-400">{f.contactStatus}</span>
                                    <div className={`w-2.5 h-2.5 rounded-full`} style={{backgroundColor: FACULTY_CHART_COLORS[f.contactStatus]}}></div>
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

export default ApplicationCard;