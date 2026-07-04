import { ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, FacultyContactStatus, ProgramType, DocumentStatus, RecommenderStatus, ScholarshipStatus } from './types';
import { Application } from './types';
import { getDaysUntil } from './utils/dateUtils';

export const PROGRAM_TYPE_OPTIONS: ProgramType[] = [
  ProgramType.PhD,
  ProgramType.Postdoc,
  ProgramType.Masters,
  ProgramType.Bachelors,
  ProgramType.Other,
];

export const DOCUMENT_STATUS_OPTIONS: DocumentStatus[] = [
  DocumentStatus.NotStarted,
  DocumentStatus.Drafting,
  DocumentStatus.Reviewing,
  DocumentStatus.ReadyToSubmit,
  DocumentStatus.Submitted,
];

export const DOCUMENT_STATUS_COLORS: { [key in DocumentStatus]: string } = {
  [DocumentStatus.NotStarted]: 'bg-zinc-500/15 text-zinc-300',
  [DocumentStatus.Drafting]: 'bg-blue-500/15 text-blue-300',
  [DocumentStatus.Reviewing]: 'bg-yellow-500/15 text-yellow-300',
  [DocumentStatus.ReadyToSubmit]: 'bg-purple-500/15 text-purple-300',
  [DocumentStatus.Submitted]: 'bg-green-500/15 text-green-300',
};

export type EssayStatus = 'Not Started' | 'Drafting' | 'Finalized';

export const ESSAY_STATUS_COLORS: { [key in EssayStatus]: string } = {
  'Not Started': 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  'Drafting': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Finalized': 'bg-green-500/15 text-green-300 border-green-500/30',
};

export const ADMISSION_TERM_OPTIONS: ('Spring' | 'Fall' | 'Summer')[] = [
  'Fall',
  'Spring',
  'Summer',
];

export const STATUS_OPTIONS: ApplicationStatus[] = [
  ApplicationStatus.NotStarted,
  ApplicationStatus.Pursuing,
  ApplicationStatus.InProgress,
  ApplicationStatus.Skipping,
  ApplicationStatus.Submitted,
  ApplicationStatus.Interview,
  ApplicationStatus.Accepted,
  ApplicationStatus.Attending,
  ApplicationStatus.Rejected,
  ApplicationStatus.Waitlisted,
  ApplicationStatus.Withdrawn,
];

export const FEE_WAIVER_STATUS_OPTIONS: ApplicationFeeWaiverStatus[] = [
  ApplicationFeeWaiverStatus.NotRequested,
  ApplicationFeeWaiverStatus.Requested,
  ApplicationFeeWaiverStatus.Granted,
  ApplicationFeeWaiverStatus.Denied,
];

export const TEST_STATUS_OPTIONS: TestStatus[] = [
  TestStatus.NotApplicable,
  TestStatus.Waived,
  TestStatus.Required,
  TestStatus.Taken,
  TestStatus.Sent,
];

export const FACULTY_CONTACT_STATUS_OPTIONS: FacultyContactStatus[] = [
  FacultyContactStatus.NotContacted,
  FacultyContactStatus.Emailed,
  FacultyContactStatus.Replied,
  FacultyContactStatus.PositiveReply,
  FacultyContactStatus.NegativeReply,
  FacultyContactStatus.PendingReview,
  FacultyContactStatus.FollowUpRequired,
  FacultyContactStatus.MeetingScheduled,
];

// Status pill styling. Each hue is deliberately distinct and matches the same
// status's colour in CHART_COLORS below, so a status reads identically whether
// it appears as a badge or in an analytics chart. Dark-only app, so single-mode
// zinc-friendly classes (translucent fill + subtle border).
export const STATUS_COLORS: { [key in ApplicationStatus]: string } = {
  [ApplicationStatus.NotStarted]: 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30',
  [ApplicationStatus.Pursuing]: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  [ApplicationStatus.InProgress]: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  [ApplicationStatus.Skipping]: 'bg-stone-500/15 text-stone-300 border border-stone-500/30',
  [ApplicationStatus.Submitted]: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  [ApplicationStatus.Interview]: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  [ApplicationStatus.Accepted]: 'bg-green-500/15 text-green-300 border border-green-500/30',
  [ApplicationStatus.Attending]: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  [ApplicationStatus.Rejected]: 'bg-red-500/15 text-red-300 border border-red-500/30',
  [ApplicationStatus.Waitlisted]: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  [ApplicationStatus.Withdrawn]: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
};

export const STATUS_LABELS: { [key in ApplicationStatus]: string } = {
  [ApplicationStatus.NotStarted]: 'Not Started',
  [ApplicationStatus.Pursuing]: 'Pursuing',
  [ApplicationStatus.InProgress]: 'In Progress',
  [ApplicationStatus.Submitted]: 'Submitted',
  [ApplicationStatus.Interview]: 'Interview',
  [ApplicationStatus.Accepted]: 'Accepted',
  [ApplicationStatus.Rejected]: 'Rejected',
  [ApplicationStatus.Waitlisted]: 'Waitlisted',
  [ApplicationStatus.Withdrawn]: 'Withdrawn',
  [ApplicationStatus.Skipping]: 'Skipping',
  [ApplicationStatus.Attending]: 'Attending',
};

export const FEE_WAIVER_STATUS_COLORS: { [key in ApplicationFeeWaiverStatus]: string } = {
  [ApplicationFeeWaiverStatus.NotRequested]: 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30',
  [ApplicationFeeWaiverStatus.Requested]: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  [ApplicationFeeWaiverStatus.Granted]: 'bg-green-500/15 text-green-300 border border-green-500/30',
  [ApplicationFeeWaiverStatus.Denied]: 'bg-red-500/15 text-red-300 border border-red-500/30',
};

export const TEST_STATUS_COLORS: { [key in TestStatus]: string } = {
  [TestStatus.NotApplicable]: 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30',
  [TestStatus.Waived]: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  [TestStatus.Required]: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  [TestStatus.Taken]: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  [TestStatus.Sent]: 'bg-green-500/15 text-green-300 border border-green-500/30',
};

export const FACULTY_CONTACT_STATUS_COLORS: { [key in FacultyContactStatus]: string } = {
  [FacultyContactStatus.NotContacted]: 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30',
  [FacultyContactStatus.Emailed]: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  [FacultyContactStatus.Replied]: 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30',
  [FacultyContactStatus.PositiveReply]: 'bg-green-500/15 text-green-300 border border-green-500/30',
  [FacultyContactStatus.NegativeReply]: 'bg-red-500/15 text-red-300 border border-red-500/30',
  [FacultyContactStatus.PendingReview]: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  [FacultyContactStatus.FollowUpRequired]: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
  [FacultyContactStatus.MeetingScheduled]: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
};

export const FACULTY_CHART_COLORS: { [key in FacultyContactStatus]: string } = {
  [FacultyContactStatus.NotContacted]: '#a1a1aa', // zinc-400
  [FacultyContactStatus.Emailed]: '#60a5fa', // blue-400
  [FacultyContactStatus.Replied]: '#a1a1aa', // zinc-400
  [FacultyContactStatus.PositiveReply]: '#4ade80', // green-400
  [FacultyContactStatus.NegativeReply]: '#f87171', // red-400
  [FacultyContactStatus.PendingReview]: '#facc15', // yellow-400
  [FacultyContactStatus.FollowUpRequired]: '#22d3ee', // cyan-400
  [FacultyContactStatus.MeetingScheduled]: '#c084fc', // purple-400
};

export const CHART_COLORS: { [key in ApplicationStatus]: string } = {
  [ApplicationStatus.NotStarted]: '#a1a1aa', // zinc-400
  [ApplicationStatus.Pursuing]: '#38bdf8', // sky-400
  [ApplicationStatus.InProgress]: '#60a5fa', // blue-400
  [ApplicationStatus.Skipping]: '#a8a29e', // stone-400
  [ApplicationStatus.Submitted]: '#818cf8', // indigo-400
  [ApplicationStatus.Interview]: '#c084fc', // purple-400
  [ApplicationStatus.Accepted]: '#4ade80', // green-400
  [ApplicationStatus.Attending]: '#34d399', // emerald-400
  [ApplicationStatus.Rejected]: '#f87171', // red-400
  [ApplicationStatus.Waitlisted]: '#fbbf24', // amber-400
  [ApplicationStatus.Withdrawn]: '#a3a3a3', // neutral-400
};

export const DOCUMENT_LABELS: { [key in keyof Application['documents']]: string } = {
  cv: 'CV / Resume',
  statementOfPurpose: 'Statement of Purpose',
  transcripts: 'Transcripts',
  lor1: 'Letter of Rec. #1',
  lor2: 'Letter of Rec. #2',
  lor3: 'Letter of Rec. #3',
  writingSample: 'Writing Sample',
};

export const POPULAR_UNIVERSITIES = [
  "Massachusetts Institute of Technology (MIT)",
  "Stanford University",
  "Harvard University",
  "California Institute of Technology (Caltech)",
  "University of Oxford",
  "University of Cambridge",
  "ETH Zurich",
  "University of California, Berkeley (UCB)",
  "Imperial College London",
  "University of Chicago",
  "Princeton University",
  "National University of Singapore (NUS)",
  "Yale University",
  "Cornell University",
  "University of California, Los Angeles (UCLA)",
  "Columbia University",
  "University of Pennsylvania",
  "University of Michigan-Ann Arbor",
  "Johns Hopkins University",
  "University of Washington",
  "Carnegie Mellon University",
  "Georgia Institute of Technology",
  "University of Texas at Austin",
  "University of Illinois at Urbana-Champaign",
  "University of California, San Diego (UCSD)",
  "University of Wisconsin-Madison",
  "University of Toronto",
  "Duke University",
  "Northwestern University",
  "New York University (NYU)",
  "University of Southern California (USC)",
  "Purdue University",
  "University of Maryland, College Park",
  "University of North Carolina at Chapel Hill",
  "University of Virginia",
  "Boston University",
  "Ohio State University",
  "Pennsylvania State University",
  "University of Florida",
  "Texas A&M University",
  "University of Minnesota",
  "Arizona State University",
  "University of British Columbia",
  "McGill University",
  "Tsinghua University",
  "Peking University",
  "University of Tokyo",
  "Nanyang Technological University (NTU)",
  "EPFL",
  "University of Melbourne"
];

// Tag presets for application categorization
export interface TagPreset {
  name: string;
  color: string;
  bgClass: string;
  icon?: string;
}

export const TAG_PRESETS: TagPreset[] = [
  { name: 'Dream School', color: '#ec4899', bgClass: 'bg-pink-500/15 text-pink-300', icon: 'star' },
  { name: 'Target', color: '#8b5cf6', bgClass: 'bg-violet-500/15 text-violet-300', icon: 'gps_fixed' },
  { name: 'Safety', color: '#22c55e', bgClass: 'bg-green-500/15 text-green-300', icon: 'shield' },
  { name: 'Funded', color: '#f59e0b', bgClass: 'bg-amber-500/15 text-amber-300', icon: 'payments' },
  { name: 'Top Choice', color: '#ef4444', bgClass: 'bg-red-500/15 text-red-300', icon: 'favorite' },
  { name: 'Research Fit', color: '#06b6d4', bgClass: 'bg-cyan-500/15 text-cyan-300', icon: 'science' },
  { name: 'Location', color: '#0ea5e9', bgClass: 'bg-sky-500/15 text-sky-300', icon: 'location_on' },
  { name: 'Deadline Soon', color: '#f97316', bgClass: 'bg-orange-500/15 text-orange-300', icon: 'schedule' },
];

// Get deadline countdown info
export function getDeadlineInfo(deadline: string | null): {
  daysLeft: number | null;
  label: string;
  colorClass: string;
  urgency: 'past' | 'urgent' | 'soon' | 'normal' | 'none';
} {
  const daysLeft = getDaysUntil(deadline);
  if (daysLeft === null) return { daysLeft: null, label: '', colorClass: '', urgency: 'none' };

  if (daysLeft < 0) {
    return { daysLeft, label: 'Past', colorClass: 'bg-zinc-500/15 text-zinc-400', urgency: 'past' };
  } else if (daysLeft === 0) {
    return { daysLeft: 0, label: 'Today!', colorClass: 'bg-red-500 text-white', urgency: 'urgent' };
  } else if (daysLeft <= 7) {
    return { daysLeft, label: `${daysLeft}d`, colorClass: 'bg-red-500/15 text-red-300', urgency: 'urgent' };
  } else if (daysLeft <= 30) {
    return { daysLeft, label: `${daysLeft}d`, colorClass: 'bg-amber-500/15 text-amber-300', urgency: 'soon' };
  } else {
    return { daysLeft, label: `${daysLeft}d`, colorClass: 'bg-green-500/15 text-green-300', urgency: 'normal' };
  }
}

export const TAG_REMOVE_PREFIX = '__remove__';

export const SCHOLARSHIP_STATUS_COLORS: { [key in ScholarshipStatus]: string } = {
  [ScholarshipStatus.Applied]: 'bg-blue-500/15 text-blue-300',
  [ScholarshipStatus.Pending]: 'bg-amber-500/15 text-amber-300',
  [ScholarshipStatus.Awarded]: 'bg-green-500/15 text-green-300',
  [ScholarshipStatus.Rejected]: 'bg-red-500/15 text-red-300',
};

export const RECOMMENDER_STATUS_OPTIONS: RecommenderStatus[] = [
  RecommenderStatus.NotStarted,
  RecommenderStatus.Requested,
  RecommenderStatus.Reminded,
  RecommenderStatus.Submitted,
];

export const RECOMMENDER_STATUS_COLORS: { [key in RecommenderStatus]: string } = {
  [RecommenderStatus.NotStarted]: 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30',
  [RecommenderStatus.Requested]: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  [RecommenderStatus.Reminded]: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  [RecommenderStatus.Submitted]: 'bg-green-500/15 text-green-300 border border-green-500/30',
};