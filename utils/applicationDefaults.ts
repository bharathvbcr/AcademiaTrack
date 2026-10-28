import {
  Application,
  ApplicationFeeWaiverStatus,
  ApplicationStatus,
  AssistantshipType,
  DocumentStatus,
  HealthInsuranceCoverage,
  ProgramType,
  StipendFrequency,
  TestStatus,
} from '../types';

type DocumentSlot = Application['documents']['cv'];

const SLOT_REQUIRED: Record<keyof Application['documents'], boolean> = {
  cv: true,
  statementOfPurpose: true,
  transcripts: true,
  lor1: false,
  lor2: false,
  lor3: false,
  writingSample: false,
};

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function fillDoc(existing: unknown, required: boolean): DocumentSlot {
  if (existing && typeof existing === 'object') {
    const slot = existing as Partial<DocumentSlot>;
    return {
      ...slot,
      required: slot.required ?? required,
      status: slot.status ?? DocumentStatus.NotStarted,
      submitted: slot.submitted ?? null,
    };
  }
  if (existing === true || (typeof existing === 'string' && existing.length > 0)) {
    return {
      required,
      status: DocumentStatus.Submitted,
      submitted: typeof existing === 'string' ? existing : null,
    };
  }
  return { required, status: DocumentStatus.NotStarted, submitted: null };
}

/**
 * Fills fields the form and board assume are present. Existing values win.
 * Unknown keys on the record are kept.
 */
export function ensureApplicationDefaults(app: Application): Application {
  const documents = app.documents && typeof app.documents === 'object'
    ? app.documents as Partial<Application['documents']>
    : {};
  const offer = app.financialOffer;
  return {
    ...app,
    status: app.status || ApplicationStatus.NotStarted,
    programType: app.programType || ProgramType.PhD,
    customProgramType: app.customProgramType ?? '',
    department: app.department ?? '',
    location: app.location ?? '',
    isR1: app.isR1 ?? false,
    universityRanking: app.universityRanking ?? '',
    departmentRanking: app.departmentRanking ?? '',
    deadline: app.deadline ?? null,
    preferredDeadline: app.preferredDeadline ?? null,
    admissionTerm: app.admissionTerm ?? null,
    admissionYear: app.admissionYear ?? null,
    applicationFee: app.applicationFee ?? 0,
    feeWaiverStatus: app.feeWaiverStatus || ApplicationFeeWaiverStatus.NotRequested,
    portalLink: app.portalLink ?? '',
    notes: app.notes ?? '',
    preferredFaculty: app.preferredFaculty ?? '',
    isPinned: app.isPinned ?? false,
    tags: asArray(app.tags),
    statusHistory: asArray(app.statusHistory),
    facultyContacts: asArray(app.facultyContacts),
    recommenders: asArray(app.recommenders),
    reminders: asArray(app.reminders),
    scholarships: asArray(app.scholarships),
    essays: asArray(app.essays),
    customFields: app.customFields && typeof app.customFields === 'object' && !Array.isArray(app.customFields)
      ? app.customFields
      : {},
    documents: {
      cv: fillDoc(documents.cv, SLOT_REQUIRED.cv),
      statementOfPurpose: fillDoc(documents.statementOfPurpose, SLOT_REQUIRED.statementOfPurpose),
      transcripts: fillDoc(documents.transcripts, SLOT_REQUIRED.transcripts),
      lor1: fillDoc(documents.lor1, SLOT_REQUIRED.lor1),
      lor2: fillDoc(documents.lor2, SLOT_REQUIRED.lor2),
      lor3: fillDoc(documents.lor3, SLOT_REQUIRED.lor3),
      writingSample: fillDoc(documents.writingSample, SLOT_REQUIRED.writingSample),
    },
    gre: {
      ...app.gre,
      status: app.gre?.status ?? TestStatus.NotApplicable,
    },
    englishTest: {
      ...app.englishTest,
      type: app.englishTest?.type || 'Not Required',
      status: app.englishTest?.status ?? TestStatus.NotApplicable,
    },
    financialOffer: {
      received: offer?.received ?? false,
      stipendAmount: offer?.stipendAmount ?? 0,
      stipendFrequency: offer?.stipendFrequency ?? StipendFrequency.Yearly,
      tuitionWaiver: offer?.tuitionWaiver ?? 0,
      healthInsurance: offer?.healthInsurance ?? HealthInsuranceCoverage.None,
      assistantship: offer?.assistantship ?? AssistantshipType.None,
      assistantshipHours: offer?.assistantshipHours ?? 0,
      notes: offer?.notes ?? '',
    },
  };
}
