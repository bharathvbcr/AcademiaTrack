import { ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, FacultyContactStatus, ProgramType, DocumentStatus, RecommenderStatus } from './types';
import { Application } from './types';

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
  [DocumentStatus.NotStarted]: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  [DocumentStatus.Drafting]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  [DocumentStatus.Reviewing]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  [DocumentStatus.ReadyToSubmit]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  [DocumentStatus.Submitted]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
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

export const STATUS_COLORS: { [key in ApplicationStatus]: string } = {
  [ApplicationStatus.NotStarted]: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
  [ApplicationStatus.Pursuing]: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-500/30',
  [ApplicationStatus.InProgress]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30',
  [ApplicationStatus.Skipping]: 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-500/20 dark:text-stone-200 dark:border-stone-500/30',
  [ApplicationStatus.Submitted]: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30',
  [ApplicationStatus.Interview]: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30',
  [ApplicationStatus.Accepted]: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30',
  [ApplicationStatus.Attending]: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30',
  [ApplicationStatus.Rejected]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30',
  [ApplicationStatus.Waitlisted]: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30',
  [ApplicationStatus.Withdrawn]: 'bg-neutral-200 text-neutral-800 border-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600',
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
  [ApplicationFeeWaiverStatus.NotRequested]: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
  [ApplicationFeeWaiverStatus.Requested]: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
  [ApplicationFeeWaiverStatus.Granted]: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  [ApplicationFeeWaiverStatus.Denied]: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
};

export const TEST_STATUS_COLORS: { [key in TestStatus]: string } = {
  [TestStatus.NotApplicable]: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
  [TestStatus.Waived]: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
  [TestStatus.Required]: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  [TestStatus.Taken]: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
  [TestStatus.Sent]: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
};

export const FACULTY_CONTACT_STATUS_COLORS: { [key in FacultyContactStatus]: string } = {
  [FacultyContactStatus.NotContacted]: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
  [FacultyContactStatus.Emailed]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30',
  [FacultyContactStatus.Replied]: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/20 dark:text-gray-200 dark:border-gray-500/30',
  [FacultyContactStatus.PositiveReply]: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30',
  [FacultyContactStatus.NegativeReply]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30',
  [FacultyContactStatus.PendingReview]: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30',
  [FacultyContactStatus.FollowUpRequired]: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-200 dark:border-cyan-500/30',
  [FacultyContactStatus.MeetingScheduled]: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30',
};

export const FACULTY_CHART_COLORS: { [key in FacultyContactStatus]: string } = {
  [FacultyContactStatus.NotContacted]: '#94a3b8', // slate-400
  [FacultyContactStatus.Emailed]: '#60a5fa', // blue-400
  [FacultyContactStatus.Replied]: '#9ca3af', // gray-400
  [FacultyContactStatus.PositiveReply]: '#4ade80', // green-400
  [FacultyContactStatus.NegativeReply]: '#f87171', // red-400
  [FacultyContactStatus.PendingReview]: '#facc15', // yellow-400
  [FacultyContactStatus.FollowUpRequired]: '#22d3ee', // cyan-400
  [FacultyContactStatus.MeetingScheduled]: '#c084fc', // purple-400
};

export const CHART_COLORS: { [key in ApplicationStatus]: string } = {
  [ApplicationStatus.NotStarted]: '#94a3b8', // slate-400
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
  { name: 'Dream School', color: '#ec4899', bgClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', icon: 'star' },
  { name: 'Target', color: '#8b5cf6', bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300', icon: 'gps_fixed' },
  { name: 'Safety', color: '#22c55e', bgClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: 'shield' },
  { name: 'Funded', color: '#f59e0b', bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: 'payments' },
  { name: 'Top Choice', color: '#ef4444', bgClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: 'favorite' },
  { name: 'Research Fit', color: '#06b6d4', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', icon: 'science' },
  { name: 'Location', color: '#0ea5e9', bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300', icon: 'location_on' },
  { name: 'Deadline Soon', color: '#f97316', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: 'schedule' },
];

// Get deadline countdown info
export function getDeadlineInfo(deadline: string | null): {
  daysLeft: number | null;
  label: string;
  colorClass: string;
  urgency: 'past' | 'urgent' | 'soon' | 'normal' | 'none';
} {
  if (!deadline) return { daysLeft: null, label: '', colorClass: '', urgency: 'none' };

  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffMs = deadlineDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { daysLeft, label: 'Past', colorClass: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400', urgency: 'past' };
  } else if (daysLeft === 0) {
    return { daysLeft: 0, label: 'Today!', colorClass: 'bg-red-500 text-white', urgency: 'urgent' };
  } else if (daysLeft <= 7) {
    return { daysLeft, label: `${daysLeft}d`, colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', urgency: 'urgent' };
  } else if (daysLeft <= 30) {
    return { daysLeft, label: `${daysLeft}d`, colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', urgency: 'soon' };
  } else {
    return { daysLeft, label: `${daysLeft}d`, colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', urgency: 'normal' };
  }
}

export const RECOMMENDER_STATUS_OPTIONS: RecommenderStatus[] = [
  RecommenderStatus.NotStarted,
  RecommenderStatus.Requested,
  RecommenderStatus.Reminded,
  RecommenderStatus.Submitted,
];

export const RECOMMENDER_STATUS_COLORS: { [key in RecommenderStatus]: string } = {
  [RecommenderStatus.NotStarted]: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
  [RecommenderStatus.Requested]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30',
  [RecommenderStatus.Reminded]: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30',
  [RecommenderStatus.Submitted]: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30',
};