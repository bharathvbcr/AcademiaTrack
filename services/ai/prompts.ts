/**
 * Prompt construction for AcademiaTrack's AI assistant.
 *
 * These are pure functions that turn the app's domain objects into compact,
 * grounded context for a local LLM. Keeping them separate from the provider and
 * the UI makes them straightforward to unit-test and to tune.
 */
import { Application, FacultyContact } from '../../types';
import { ChatMessage } from './types';

export const SYSTEM_PROMPT =
    'You are the AI assistant inside AcademiaTrack, a desktop app where a student ' +
    'tracks their graduate-school applications. You help with planning, writing, and ' +
    'decision-making for the admissions process. Be concise, concrete, and practical. ' +
    'Use Markdown. When you are given application data as context, ground your answer ' +
    'in it and never invent facts (deadlines, funding, names) that are not present. If ' +
    'a needed detail is missing, say so plainly rather than guessing.';

function fmtDate(d: string | null | undefined): string {
    if (!d) return 'not set';
    return d;
}

/** A compact, token-efficient summary of a single application for grounding. */
export function summarizeApplication(app: Application): string {
    const docs = Object.entries(app.documents)
        .filter(([, v]) => v.required)
        .map(([k, v]) => `${k}=${v.status}`)
        .join(', ');
    const faculty = (app.facultyContacts ?? [])
        .map((f) => `${f.name} (${f.contactStatus})`)
        .join('; ');
    const essays = (app.essays ?? [])
        .map((e) => `${e.name} [${e.status}]`)
        .join('; ');
    const lines = [
        `University: ${app.universityName}`,
        `Program: ${app.programName} (${app.customProgramType || app.programType})`,
        `Department: ${app.department || 'n/a'}`,
        `Status: ${app.status}`,
        `Deadline: ${fmtDate(app.deadline)}${app.preferredDeadline ? ` (preferred: ${fmtDate(app.preferredDeadline)})` : ''}`,
        app.admissionTerm || app.admissionYear
            ? `Term: ${app.admissionTerm ?? ''} ${app.admissionYear ?? ''}`.trim()
            : '',
        typeof app.admissionChance === 'number' ? `Admission chance (self-est.): ${app.admissionChance}%` : '',
        docs ? `Required documents: ${docs}` : '',
        essays ? `Essays: ${essays}` : '',
        faculty ? `Faculty contacts: ${faculty}` : '',
        app.preferredFaculty ? `Preferred faculty: ${app.preferredFaculty}` : '',
        app.tags?.length ? `Tags: ${app.tags.join(', ')}` : '',
        app.notes ? `Notes: ${app.notes.slice(0, 500)}` : '',
    ].filter(Boolean);
    return lines.join('\n');
}

/** A portfolio-level summary across all applications. */
export function summarizePortfolio(apps: Application[]): string {
    if (apps.length === 0) return 'The student has no applications yet.';
    const header = `The student is tracking ${apps.length} application(s).`;
    const rows = apps.map((a, i) => {
        const docsDone = Object.values(a.documents).filter((d) => d.required && d.status === 'Submitted').length;
        const docsReq = Object.values(a.documents).filter((d) => d.required).length;
        return (
            `${i + 1}. ${a.universityName} — ${a.programName} | status: ${a.status} | ` +
            `deadline: ${fmtDate(a.deadline)} | docs: ${docsDone}/${docsReq} submitted`
        );
    });
    return [header, ...rows].join('\n');
}

/** Build a user turn that asks for prioritized next steps on one application. */
export function buildNextStepsMessages(app: Application): ChatMessage[] {
    return [
        { role: 'system', content: SYSTEM_PROMPT },
        {
            role: 'user',
            content:
                'Here is one of my applications:\n\n' +
                summarizeApplication(app) +
                "\n\nBased only on this data, give me a short, prioritized checklist of the most " +
                'important next actions, with the most time-sensitive items first. Note anything ' +
                'that looks incomplete, missing, or at risk given the deadline. Keep it under 8 items.',
        },
    ];
}

/** Build a user turn that analyzes the whole portfolio. */
export function buildPortfolioInsightsMessages(apps: Application[]): ChatMessage[] {
    return [
        { role: 'system', content: SYSTEM_PROMPT },
        {
            role: 'user',
            content:
                'Here is my full application portfolio:\n\n' +
                summarizePortfolio(apps) +
                '\n\nGive me a brief situational read: which applications need attention most ' +
                'urgently, where I am behind, any deadline clustering or risks, and 3–5 concrete ' +
                'recommendations. Be specific and reference applications by name.',
        },
    ];
}

/** Build a user turn that drafts an outreach email to a faculty member. */
export function buildFacultyEmailMessages(
    app: Application,
    faculty: FacultyContact,
    extraInstructions?: string,
): ChatMessage[] {
    const facultyBlock = [
        `Name: ${faculty.name}`,
        faculty.researchArea ? `Research area: ${faculty.researchArea}` : '',
        faculty.fitNotes ? `Why I'm a fit: ${faculty.fitNotes}` : '',
        faculty.papersRead?.length ? `Papers I've read: ${faculty.papersRead.join('; ')}` : '',
        `Current contact status: ${faculty.contactStatus}`,
    ]
        .filter(Boolean)
        .join('\n');
    return [
        { role: 'system', content: SYSTEM_PROMPT },
        {
            role: 'user',
            content:
                `I want to email a prospective advisor about the ${app.programName} program at ` +
                `${app.universityName}. Here is what I know about them:\n\n${facultyBlock}\n\n` +
                'Draft a concise, professional, genuine cold outreach email expressing interest in ' +
                'their research and a potential PhD/grad fit. Keep it under ~180 words, avoid flattery ' +
                'and clichés, and include a subject line. Leave clearly-marked [placeholders] for any ' +
                'specifics I must fill in myself.' +
                (extraInstructions ? `\n\nAdditional instructions: ${extraInstructions}` : ''),
        },
    ];
}

/** Build a user turn that critiques an essay/SOP draft. */
export function buildEssayFeedbackMessages(
    app: Application,
    essayName: string,
    essayText: string,
): ChatMessage[] {
    return [
        { role: 'system', content: SYSTEM_PROMPT },
        {
            role: 'user',
            content:
                `This is my "${essayName}" for the ${app.programName} program at ${app.universityName}. ` +
                'Give me focused, actionable feedback: what is strong, what is weak, and specific ' +
                'revisions to make it more compelling and tailored to this program. Do NOT rewrite the ' +
                'whole essay — point to concrete lines/ideas. Finish with a 1–10 readiness score.\n\n' +
                '--- ESSAY ---\n' +
                essayText.slice(0, 8000),
        },
    ];
}
