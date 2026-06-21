import React, { useEffect, useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Application, ApplicationStatus, ProgramType, FacultyContactStatus, DocumentStatus } from '../../types';
import { FEE_WAIVER_STATUS_COLORS, TEST_STATUS_COLORS } from '../../constants';
import { sanitizeURL } from '../../utils';
import { getStorageItem, setStorageItem, removeStorageItem } from '../../utils/browserStorage';
import { CardHeader, DocumentChecklist, FacultyOutreachList, CardFooter } from './subcomponents';

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
        <h4 className="text-sm font-bold text-[#F5D7DA] mb-2">{title}</h4>
        <div className="space-y-1.5 pl-1 border-l-2 border-[#E8B4B8]/30 ml-1">
            <div className="pl-3">
                {children}
            </div>
        </div>
    </div>
);

const InfoRow: React.FC<{ icon: string; label: string; value?: string; children?: React.ReactNode }> = ({ icon, label, value, children }) => (
    <div className="flex justify-between items-start text-sm">
        <div className="flex items-center gap-2 shrink-0 pr-4">
            <MaterialIcon name={icon} className="text-base text-[#E8B4B8]" />
            <span className="font-medium text-[#E8B4B8]">{label}</span>
        </div>
        <div className="text-right">
            {value ? <span className="font-semibold text-[#F5D7DA]">{value}</span> : children}
        </div>
    </div>
);

const ApplicationCard: React.FC<ApplicationCardProps> = React.memo(({ application, onEdit, onDelete, onUpdate, isExpanded, onToggleExpand }) => {
    const { id, universityName, programName, deadline, status, portalLink } = application;
    const prevStatusRef = useRef<ApplicationStatus>(status);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    // Fetch university logo
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const fetchLogo = async () => {
            if (!getStorageItem('fetch-logos-enabled')) return;
            if (!getStorageItem('showUniversityLogos')) return;

            const cacheKey = `university_logo_${universityName}`;
            const cached = getStorageItem(cacheKey);
            const cachedTs = getStorageItem(cacheKey + '_ts');
            const cacheValid = cached && cachedTs && (Date.now() - parseInt(cachedTs) < 7 * 86400 * 1000);
            if (cacheValid) {
                if (!cancelled) setLogoUrl(cached);
                return;
            }
            if (cached) {
                removeStorageItem(cacheKey);
                removeStorageItem(cacheKey + '_ts');
            }

            // Abort a stalled request after 5s so a slow/unresponsive server
            // doesn't leave the fetch hanging indefinitely.
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
                const cleanName = universityName.split('(')[0].trim();
                const response = await fetch(`https://universities.hipolabs.com/search?name=${encodeURIComponent(cleanName)}`, { signal: controller.signal });
                const data = await response.json();

                if (!cancelled && data && data.length > 0 && data[0].domains && data[0].domains.length > 0) {
                    const domain = data[0].domains[0];
                    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) throw new Error('Invalid domain');
                    const faviconUrl = `https://${domain}/favicon.ico`;
                    if (!cancelled) {
                        setLogoUrl(faviconUrl);
                        setStorageItem(cacheKey, faviconUrl);
                        setStorageItem(cacheKey + '_ts', Date.now().toString());
                    }
                }
            } catch (e) {
                if (!cancelled && !(e instanceof DOMException && e.name === 'AbortError')) console.error("Failed to fetch logo", e);
            } finally {
                clearTimeout(timeoutId);
            }
        };

        if (!getStorageItem('fetch-logos-enabled') || !getStorageItem('showUniversityLogos')) {
            Object.keys(localStorage)
                .filter(k => k.startsWith('university_logo_'))
                .forEach(k => removeStorageItem(k));
            setLogoUrl(null);
            return () => { cancelled = true; };
        }

        if (universityName) fetchLogo();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [universityName]);

    // Check for upcoming interviews
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

    // Celebration confetti on acceptance
    useEffect(() => {
        let frameId: number | null = null;
        let burstTimeout: ReturnType<typeof setTimeout> | undefined;
        if (prevStatusRef.current !== ApplicationStatus.Accepted && status === ApplicationStatus.Accepted) {
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
                    frameId = requestAnimationFrame(frame);
                }
            }());

            burstTimeout = setTimeout(() => {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#bb0000', '#ffffff']
                });
            }, 500);
        }
        prevStatusRef.current = status;
        // Stop the animation loop / pending burst if the card unmounts mid-celebration.
        return () => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            if (burstTimeout !== undefined) clearTimeout(burstTimeout);
        };
    }, [status]);

    const deadlineDate = deadline ? new Date(deadline + 'T00:00:00') : null;

    const programTypeValue = application.programType === ProgramType.Other
        ? application.customProgramType || 'Other'
        : application.programType;

    const handleStatusChange = React.useCallback((newStatus: ApplicationStatus) => {
        onUpdate({ ...application, status: newStatus });
    }, [application, onUpdate]);

    const handleDocumentStatusChange = React.useCallback((docKey: keyof Application['documents'], newStatus: DocumentStatus) => {
        const doc = application.documents[docKey];
        const newSubmittedDate = newStatus === DocumentStatus.Submitted
            ? new Date().toISOString().split('T')[0]
            : null;

        const updatedDocuments = {
            ...application.documents,
            [docKey]: { ...doc, status: newStatus, submitted: newSubmittedDate }
        };
        onUpdate({ ...application, documents: updatedDocuments });
    }, [application, onUpdate]);

    return (
        <motion.div
            className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden"
            onClick={onToggleExpand}
            whileHover={{ y: -4, scale: 1.01, boxShadow: '0 20px 25px -5px rgba(220, 20, 60, 0.3), 0 10px 10px -5px rgba(220, 20, 60, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <div className="cursor-pointer">
                {/* Header */}
                <CardHeader
                    universityName={universityName}
                    programName={programName}
                    portalLink={portalLink}
                    logoUrl={logoUrl}
                    status={status}
                    hasUpcomingInterview={hasUpcomingInterview}
                    onStatusChange={handleStatusChange}
                    sanitizeURL={sanitizeURL}
                />

                {/* At-a-glance Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#E8B4B8] mb-4">
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
                        <div className="flex items-center gap-1.5 text-[#E03030] font-semibold">
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
                            <DocumentChecklist
                                documents={application.documents}
                                onDocumentStatusChange={handleDocumentStatusChange}
                            />
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
                                <FacultyOutreachList facultyContacts={application.facultyContacts} />
                            </DetailsSection>
                        )}

                        {application.notes && (
                            <DetailsSection title="Notes">
                                <p className="text-sm text-[#E8B4B8] whitespace-pre-wrap">{application.notes}</p>
                            </DetailsSection>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <CardFooter
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                onEdit={() => onEdit(application)}
                onDelete={() => onDelete(id)}
            />
        </motion.div>
    );
}, (prevProps, nextProps) => {
    const pa = prevProps.application, na = nextProps.application;
    return (
        pa.id === na.id &&
        pa.status === na.status &&
        pa.deadline === na.deadline &&
        pa.universityName === na.universityName &&
        pa.programName === na.programName &&
        pa.portalLink === na.portalLink &&
        pa.programType === na.programType &&
        pa.customProgramType === na.customProgramType &&
        pa.department === na.department &&
        pa.admissionTerm === na.admissionTerm &&
        pa.admissionYear === na.admissionYear &&
        pa.notes === na.notes &&
        pa.feeWaiverStatus === na.feeWaiverStatus &&
        pa.universityRanking === na.universityRanking &&
        pa.departmentRanking === na.departmentRanking &&
        pa.gre.status === na.gre.status &&
        pa.englishTest.status === na.englishTest.status &&
        pa.englishTest.type === na.englishTest.type &&
        prevProps.isExpanded === nextProps.isExpanded &&
        pa.documents === na.documents &&
        pa.facultyContacts === na.facultyContacts
    );
});

ApplicationCard.displayName = 'ApplicationCard';

export default ApplicationCard;
