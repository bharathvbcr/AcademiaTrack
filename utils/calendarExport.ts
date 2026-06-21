import { Application, ApplicationStatus } from '../types';

/**
 * Generate an iCalendar (.ics) file from application deadlines
 */
export function generateICS(applications: Application[], includeContactDetails: boolean = false): string {
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

    // RFC 5545 §3.1: content lines longer than 75 octets MUST be folded with
    // CRLF followed by a single space. Split on UTF-8 octet boundaries (never
    // mid-character) so emoji/multibyte content stays intact.
    const encoder = new TextEncoder();
    const foldLine = (line: string): string => {
        if (encoder.encode(line).length <= 75) return line;
        const segments: string[] = [];
        let current = '';
        let first = true;
        for (const ch of line) {
            // Continuation lines carry a leading space that counts toward the limit.
            const limit = first ? 75 : 74;
            if (encoder.encode(current + ch).length > limit) {
                segments.push(current);
                current = ch;
                first = false;
            } else {
                current += ch;
            }
        }
        segments.push(current);
        return segments.join('\r\n ');
    };

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AcademiaTrack//Application Tracker//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:AcademiaTrack Deadlines',
    ];

    applications.forEach(app => {
        // Application deadline
        if (app.deadline) {
            lines.push(
                'BEGIN:VEVENT',
                `UID:deadline-${app.id}@academiatrack`,
                `DTSTAMP:${formatDateTime(now)}`,
                `DTSTART;VALUE=DATE:${formatDate(app.deadline)}`,
                `SUMMARY:📅 Deadline: ${escapeText(app.universityName)}`,
                `DESCRIPTION:${escapeText(`${app.programName} - ${app.status}\nPortal: ${app.portalLink || 'N/A'}`)}`,
                'CATEGORIES:DEADLINE',
                'END:VEVENT',
            );
        }

        // Decision deadline (for accepted offers)
        if (app.decisionDeadline && app.status === ApplicationStatus.Accepted) {
            lines.push(
                'BEGIN:VEVENT',
                `UID:decision-${app.id}@academiatrack`,
                `DTSTAMP:${formatDateTime(now)}`,
                `DTSTART;VALUE=DATE:${formatDate(app.decisionDeadline)}`,
                `SUMMARY:⏰ Decision Due: ${escapeText(app.universityName)}`,
                `DESCRIPTION:${escapeText(`Respond to ${app.programName} offer by this date`)}`,
                'CATEGORIES:DECISION',
                'END:VEVENT',
            );
        }

        // Interview dates from faculty contacts
        app.facultyContacts?.forEach(contact => {
            if (contact.interviewDate) {
                lines.push(
                    'BEGIN:VEVENT',
                    `UID:interview-${app.id}-${contact.id}@academiatrack`,
                    `DTSTAMP:${formatDateTime(now)}`,
                    `DTSTART;VALUE=DATE:${formatDate(contact.interviewDate)}`,
                    `SUMMARY:🎤 Interview: ${escapeText(contact.name)} (${escapeText(app.universityName)})`,
                    `DESCRIPTION:${escapeText(includeContactDetails ? `Interview with ${contact.name}\nEmail: ${contact.email}\n${contact.interviewNotes || ''}` : `Interview with ${contact.name}\nSee AcademiaTrack for full contact details.`)}`,
                    'CATEGORIES:INTERVIEW',
                    'END:VEVENT',
                );
            }
        });
    });

    lines.push('END:VCALENDAR');

    // RFC 5545 requires CRLF line breaks between (folded) content lines.
    return lines.map(foldLine).join('\r\n');
}

/**
 * Download the ICS file
 */
export function downloadICS(applications: Application[], includeContactDetails: boolean = false): void {
    const icsContent = generateICS(applications, includeContactDetails);
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
