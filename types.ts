// Fix: Removed a self-import of `ApplicationStatus` which was causing a conflict with its own declaration.

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
  Sent = 'Sent',
}

export enum FacultyContactStatus {
  NotContacted = 'Not Contacted',
  Emailed = 'Emailed',
  Replied = 'Replied',
  MeetingScheduled = 'Meeting Scheduled',
}

export interface FacultyContact {
  id: number;
  name: string;
  website: string;
  email: string;
  researchArea: string;
  contactStatus: FacultyContactStatus;
  contactDate: string | null;
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
  deadline: string;
  preferredDeadline?: string;
  applicationFee: number;
  feeWaiverStatus: ApplicationFeeWaiverStatus;
  portalLink: string;

  documents: {
    cv: { required: boolean; submitted: string | null };
    statementOfPurpose: { required: boolean; submitted: string | null };
    transcripts: { required: boolean; submitted: string | null };
    lor1: { required: boolean; submitted: string | null };
    lor2: { required: boolean; submitted: string | null };
    lor3: { required: boolean; submitted: string | null };
    writingSample: { required: boolean; submitted: string | null };
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