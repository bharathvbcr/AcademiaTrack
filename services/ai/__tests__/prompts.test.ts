import { describe, expect, it } from 'vitest';
import {
    summarizeApplication,
    summarizePortfolio,
    buildNextStepsMessages,
    buildFacultyEmailMessages,
    buildEssayFeedbackMessages,
    SYSTEM_PROMPT,
} from '../prompts';
import { Application, FacultyContact } from '../../../types';
import {
    ProgramType,
    ApplicationStatus,
    ApplicationFeeWaiverStatus,
    DocumentStatus,
    TestStatus,
    FacultyContactStatus,
} from '../../../types/enums';

function makeApp(overrides: Partial<Application> = {}): Application {
    const doc = (status: DocumentStatus) => ({ required: true, status, submitted: null });
    return {
        id: 'app-1',
        universityName: 'Stanford University',
        programName: 'Computer Science',
        programType: ProgramType.PhD,
        department: 'CS',
        location: 'Stanford, CA',
        isR1: true,
        universityRanking: '1',
        departmentRanking: '1',
        status: ApplicationStatus.InProgress,
        deadline: '2026-12-01',
        preferredDeadline: null,
        admissionTerm: 'Fall',
        admissionYear: '2027',
        applicationFee: 125,
        feeWaiverStatus: ApplicationFeeWaiverStatus.NotRequested,
        portalLink: '',
        documents: {
            cv: doc(DocumentStatus.Submitted),
            statementOfPurpose: doc(DocumentStatus.Drafting),
            transcripts: doc(DocumentStatus.NotStarted),
            lor1: doc(DocumentStatus.NotStarted),
            lor2: doc(DocumentStatus.NotStarted),
            lor3: { required: false, status: DocumentStatus.NotStarted, submitted: null },
            writingSample: { required: false, status: DocumentStatus.NotStarted, submitted: null },
        },
        facultyContacts: [],
        notes: 'Great fit for my robotics interest.',
        englishTest: { type: 'TOEFL', status: TestStatus.NotApplicable },
        gre: { status: TestStatus.NotApplicable },
        ...overrides,
    } as Application;
}

const faculty: FacultyContact = {
    id: 'fac-1',
    name: 'Dr. Ada Lovelace',
    website: '',
    email: 'ada@stanford.edu',
    researchArea: 'Reinforcement learning',
    contactStatus: FacultyContactStatus.NotContacted,
    contactDate: null,
    interviewDate: null,
    fitNotes: 'Her work on policy gradients overlaps my thesis.',
    papersRead: ['Policy Gradient Methods (2024)'],
};

describe('summarizeApplication', () => {
    it('includes the key grounding fields', () => {
        const out = summarizeApplication(makeApp());
        expect(out).toContain('Stanford University');
        expect(out).toContain('Computer Science');
        expect(out).toContain('2026-12-01');
        expect(out).toContain('statementOfPurpose=Drafting');
    });

    it('only lists required documents', () => {
        const out = summarizeApplication(makeApp());
        expect(out).not.toContain('writingSample');
    });
});

describe('summarizePortfolio', () => {
    it('handles an empty portfolio', () => {
        expect(summarizePortfolio([])).toMatch(/no applications/i);
    });

    it('counts submitted required documents', () => {
        const out = summarizePortfolio([makeApp()]);
        expect(out).toContain('1 application');
        // cv submitted -> 1 of 5 required docs (cv, sop, transcripts, lor1, lor2)
        expect(out).toContain('docs: 1/5 submitted');
    });
});

describe('message builders', () => {
    it('next steps starts with the system prompt then a grounded user turn', () => {
        const msgs = buildNextStepsMessages(makeApp());
        expect(msgs[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT });
        expect(msgs[1].role).toBe('user');
        expect(msgs[1].content).toContain('Stanford University');
    });

    it('faculty email embeds the contact details and asks for a subject line', () => {
        const msgs = buildFacultyEmailMessages(makeApp(), faculty);
        expect(msgs[1].content).toContain('Dr. Ada Lovelace');
        expect(msgs[1].content).toContain('Reinforcement learning');
        expect(msgs[1].content.toLowerCase()).toContain('subject line');
    });

    it('essay feedback truncates very long drafts', () => {
        const huge = 'x'.repeat(20000);
        const msgs = buildEssayFeedbackMessages(makeApp(), 'SOP', huge);
        expect(msgs[1].content).toContain('x'.repeat(8000));
        expect(msgs[1].content).not.toContain('x'.repeat(8001));
    });
});
