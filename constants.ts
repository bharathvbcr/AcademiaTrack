import { ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, FacultyContactStatus, ProgramType } from './types';
import { Application } from './types';

export const PROGRAM_TYPE_OPTIONS: ProgramType[] = [
  ProgramType.PhD,
  ProgramType.Postdoc,
  ProgramType.Masters,
  ProgramType.Bachelors,
  ProgramType.Other,
];

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