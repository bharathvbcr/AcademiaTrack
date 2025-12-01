import {
    ProgramType,
    ApplicationStatus,
    ApplicationFeeWaiverStatus,
    TestStatus,
    FacultyContactStatus,
    DocumentStatus,
    RecommenderStatus,
    StipendFrequency,
    HealthInsuranceCoverage,
    AssistantshipType,
    ScholarshipStatus
} from './enums';

export interface Correspondence {
    id: string | number;
    date: string; // ISO Date
    type: 'Email Sent' | 'Email Received' | 'Meeting' | 'Other';
    subject: string;
    notes: string;
}

export interface EssayDraft {
    id: string | number;
    version: number;
    date: string; // ISO Date
    wordCount: number;
    filePath?: string;
    notes: string;
}

export interface Essay {
    id: string | number;
    type: 'SOP' | 'Personal History' | 'Diversity Statement' | 'Other';
    name: string;
    drafts: EssayDraft[];
    status: 'Not Started' | 'Drafting' | 'Finalized';
    finalDraftId?: string | number;
}

export interface FacultyContact {
    id: string | number;
    name: string;
    website: string;
    email: string;
    researchArea: string;
    contactStatus: FacultyContactStatus;
    contactDate: string | null; // ISO Date string
    interviewDate: string | null; // ISO Date string
    // Interview Prep
    interviewNotes?: string;
    questions?: string;
    answers?: string;
    // Research Fit
    papersRead?: string[];
    fitScore?: number; // 1-10
    fitNotes?: string;
    correspondence?: Correspondence[];
}

export interface Reminder {
    id: string;
    text: string;
    date: string; // ISO Date
    completed: boolean;
}

export interface LocationDetails {
    city: string;
    state?: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utcOffset: number; // Offset in seconds
    dstActive?: boolean;
}

export interface UniversityResult {
    name: string;
    web_pages: string[];
    country: string;
    'state-province': string | null;
    domains: string[];
}

export interface Recommender {
    id: string | number;
    name: string;
    title: string;
    email: string;
    relationship: string;
    status: RecommenderStatus;
    dateRequested: string | null;
    dateSubmitted: string | null;
    notes: string;
}

export interface FinancialOffer {
    received: boolean;
    stipendAmount: number;
    stipendFrequency: StipendFrequency;
    tuitionWaiver: number; // Percentage (0-100)
    healthInsurance: HealthInsuranceCoverage;
    assistantship: AssistantshipType;
    assistantshipHours: number; // Hours per week
    notes: string;
}

export interface Scholarship {
    id: string | number;
    name: string;
    amount: number;
    duration: string; // e.g., "1 year", "Renewable"
    deadline: string | null;
    status: ScholarshipStatus;
    link: string;
    notes: string;
}

export interface Application {
    id: string;
    universityName: string;
    programName: string;
    programType: ProgramType;
    customProgramType?: string;
    department: string;
    location: string;
    locationDetails?: LocationDetails;
    isR1: boolean;
    universityRanking: string;
    departmentRanking: string;

    status: ApplicationStatus;
    deadline: string | null;
    preferredDeadline: string | null;
    admissionTerm: 'Spring' | 'Fall' | 'Summer' | null;
    admissionYear: string | null;
    applicationFee: number;
    feeWaiverStatus: ApplicationFeeWaiverStatus;
    portalLink: string;

    documents: {
        cv: { required: boolean; status: DocumentStatus; submitted: string | null; filePath?: string };
        statementOfPurpose: { required: boolean; status: DocumentStatus; submitted: string | null; filePath?: string };
        transcripts: { required: boolean; status: DocumentStatus; submitted: string | null; filePath?: string };
        lor1: { required: boolean; status: DocumentStatus; submitted: string | null; filePath?: string };
        lor2: { required: boolean; status: DocumentStatus; submitted: string | null; filePath?: string };
        lor3: { required: boolean; status: DocumentStatus; submitted: string | null; filePath?: string };
        writingSample: { required: boolean; status: DocumentStatus; submitted: string | null; filePath?: string };
    };

    facultyContacts: FacultyContact[];
    recommenders?: Recommender[];
    reminders?: Reminder[];
    notes: string;

    // Financials
    financialOffer?: FinancialOffer;
    scholarships?: Scholarship[];

    // Essays
    essays?: Essay[];

    englishTest: {
        type: string;
        status: TestStatus;
        cost?: number;
    };
    preferredFaculty?: string;

    gre: {
        status: TestStatus;
        cost?: number;
    };
}

export interface ElectronAPI {
    selectFile: () => Promise<string | null>;
    openFile: (path: string) => Promise<void>;
    loadData: () => Promise<Application[] | null>;
    saveData: (data: Application[]) => Promise<void>;
    showNotification: (title: string, body: string) => void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
