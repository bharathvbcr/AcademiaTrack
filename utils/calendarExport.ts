import { Application, ApplicationStatus } from '../types';

/**
 * Generate an iCalendar (.ics) file from application deadlines
 */
export function generateICS(applications: Application[]): string {
    const now = new Date();
    const formatDate = (dateStr: string): string => {
        // Convert YYYY-MM-DD to YYYYMMDD format
        return dateStr.replace(/-/g, '');
    };

    const formatDateTime = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeText = (text: string): string => {
        return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };

    const events: string[] = [];

    applications.forEach(app => {
        // Application deadline
        if (app.deadline) {
            events.push(`BEGIN:VEVENT
UID:deadline-${app.id}@academiatrack
DTSTAMP:${formatDateTime(now)}
DTSTART;VALUE=DATE:${formatDate(app.deadline)}
SUMMARY:📅 Deadline: ${escapeText(app.universityName)}
DESCRIPTION:${escapeText(`${app.programName} - ${app.status}\\nPortal: ${app.portalLink || 'N/A'}`)}
CATEGORIES:DEADLINE
END:VEVENT`);
        }

        // Decision deadline (for accepted offers)
        if (app.decisionDeadline && app.status === ApplicationStatus.Accepted) {
            events.push(`BEGIN:VEVENT
UID:decision-${app.id}@academiatrack
DTSTAMP:${formatDateTime(now)}
DTSTART;VALUE=DATE:${formatDate(app.decisionDeadline)}
SUMMARY:⏰ Decision Due: ${escapeText(app.universityName)}
DESCRIPTION:${escapeText(`Respond to ${app.programName} offer by this date`)}
CATEGORIES:DECISION
END:VEVENT`);
        }

        // Interview dates from faculty contacts
        app.facultyContacts?.forEach(contact => {
            if (contact.interviewDate) {
                events.push(`BEGIN:VEVENT
UID:interview-${app.id}-${contact.id}@academiatrack
DTSTAMP:${formatDateTime(now)}
DTSTART;VALUE=DATE:${formatDate(contact.interviewDate)}
SUMMARY:🎤 Interview: ${escapeText(contact.name)} (${escapeText(app.universityName)})
DESCRIPTION:${escapeText(`Interview with ${contact.name}\\nEmail: ${contact.email}\\n${contact.interviewNotes || ''}`)}
CATEGORIES:INTERVIEW
END:VEVENT`);
            }
        });
    });

    const calendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AcademiaTrack//Application Tracker//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:AcademiaTrack Deadlines
${events.join('\n')}
END:VCALENDAR`;

    return calendar;
}

/**
 * Download the ICS file
 */
export function downloadICS(applications: Application[]): void {
    const icsContent = generateICS(applications);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `academiatrack-deadlines-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
