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

export enum DocumentStatus {
    NotStarted = 'Not Started',
    Drafting = 'Drafting',
    Reviewing = 'Reviewing',
    ReadyToSubmit = 'Ready to Submit',
    Submitted = 'Submitted',
}

export enum RecommenderStatus {
    NotStarted = 'Not Started',
    Requested = 'Requested',
    Reminded = 'Reminded',
    Submitted = 'Submitted',
}

export enum StipendFrequency {
    Monthly = 'Monthly',
    Yearly = 'Yearly',
}

export enum HealthInsuranceCoverage {
    Full = 'Full',
    Partial = 'Partial',
    None = 'None',
}

export enum AssistantshipType {
    TA = 'Teaching Assistant',
    RA = 'Research Assistant',
    GA = 'Graduate Assistant',
    Fellowship = 'Fellowship',
    None = 'None',
}

export enum ScholarshipStatus {
    Applied = 'Applied',
    Awarded = 'Awarded',
    Rejected = 'Rejected',
    Pending = 'Pending',
}
