export enum ProgramType {
  Bachelors = "Bachelor's",
  Masters = "Master's",
  PhD = "PhD",
  Postdoc = "Postdoc",
  Other = "Other",
}

export enum ApplicationStatus {
  NotStarted = 'Not Started',
  Pursuing = 'Pursuing',
  InProgress = 'In Progress',
  Submitted = 'Submitted',
  Interview = 'Interview',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  Waitlisted = 'Waitlisted',
  Withdrawn = 'Withdrawn',
  Skipping = 'Skipping',
  Attending = 'Attending',
}

export enum ApplicationFeeWaiverStatus {
  NotRequested = 'Not Requested',
  Requested = 'Requested',
  Granted = 'Granted',
  Denied = 'Denied',
}

export enum TestStatus {
  NotApplicable = 'Not Applicable',
  Waived = 'Waived',
  Required = 'Required',
  Taken = 'Taken',
  Sent = 'Sent',
}

export enum FacultyContactStatus {
  NotContacted = 'Not Contacted',
  Emailed = 'Emailed',
  Replied = 'Replied',
  PositiveReply = 'Positive Reply',
  NegativeReply = 'Negative Reply',
  PendingReview = 'Pending Review',
  FollowUpRequired = 'Follow-up Required',
  MeetingScheduled = 'Meeting Scheduled',
}

export interface FacultyContact {
  id: number;
  name: string;
  website: string;
  email: string;
  researchArea: string;
  contactStatus: FacultyContactStatus;
  contactDate: string | null; // ISO Date string
  interviewDate: string | null; // ISO Date string
}

export enum DocumentStatus {
  NotStarted = 'Not Started',
  Drafting = 'Drafting',
  Reviewing = 'Reviewing',
  ReadyToSubmit = 'Ready to Submit',
  Submitted = 'Submitted',
}

export interface Application {
  id: string;
  universityName: string;
  programName: string;
  programType: ProgramType;
  customProgramType?: string;
  department: string;
  location: string;
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
    cv: { required: boolean; status: DocumentStatus; submitted: string | null };
    statementOfPurpose: { required: boolean; status: DocumentStatus; submitted: string | null };
    transcripts: { required: boolean; status: DocumentStatus; submitted: string | null };
    lor1: { required: boolean; status: DocumentStatus; submitted: string | null };
    lor2: { required: boolean; status: DocumentStatus; submitted: string | null };
    lor3: { required: boolean; status: DocumentStatus; submitted: string | null };
    writingSample: { required: boolean; status: DocumentStatus; submitted: string | null };
  };

  gre: {
    status: TestStatus;
  };

  englishTest: {
    type: 'TOEFL' | 'IELTS' | 'Not Required';
    status: TestStatus;
  };

  facultyContacts: FacultyContact[];
  preferredFaculty: string;

  notes: string;
}

export interface ElectronAPI {
  loadData: () => Promise<Application[] | null>;
  saveData: (data: Application[]) => Promise<boolean>;
  showNotification: (title: string, body: string) => Promise<void>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}