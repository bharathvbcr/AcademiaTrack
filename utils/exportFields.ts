import { Application } from '../types';

export const getFieldValue = (app: Application, fieldId: string): string | number | null => {
  switch (fieldId) {
    case 'universityName': return app.universityName;
    case 'programName': return app.programName;
    case 'programType': return app.programType === 'Other' ? (app.customProgramType || 'Other') : app.programType;
    case 'department': return app.department || '';
    case 'location': return app.location || '';
    case 'status': return app.status;
    case 'deadline': return app.deadline || '';
    case 'preferredDeadline': return app.preferredDeadline || '';
    case 'decisionDeadline': return app.decisionDeadline || '';
    case 'admissionTerm': return app.admissionTerm || '';
    case 'admissionYear': return app.admissionYear || '';
    case 'applicationFee': return app.applicationFee;
    case 'feeWaiverStatus': return app.feeWaiverStatus;
    case 'universityRanking': return app.universityRanking;
    case 'departmentRanking': return app.departmentRanking;
    case 'isR1': return app.isR1 ? 'Yes' : 'No';
    case 'admissionChance': return app.admissionChance ?? '';
    case 'tags': return app.tags?.join(', ') || '';
    case 'portalLink': return app.portalLink || '';
    case 'notes': return app.notes || '';
    case 'cv': return app.documents.cv.status;
    case 'statementOfPurpose': return app.documents.statementOfPurpose.status;
    case 'transcripts': return app.documents.transcripts.status;
    case 'lor1': return app.documents.lor1.status;
    case 'lor2': return app.documents.lor2.status;
    case 'lor3': return app.documents.lor3.status;
    case 'writingSample': return app.documents.writingSample.status;
    case 'greStatus': return app.gre.status;
    case 'englishTestType': return app.englishTest.type;
    case 'englishTestStatus': return app.englishTest.status;
    case 'facultyContacts': return app.facultyContacts?.map(f => f.name).filter(Boolean).join('; ') || '';
    case 'recommenders': return app.recommenders?.map(r => r.name).filter(Boolean).join('; ') || '';
    case 'preferredFaculty': return app.preferredFaculty || '';
    default: return '';
  }
};

export const getFieldLabel = (fieldId: string): string => {
  const labels: Record<string, string> = {
    universityName: 'University Name',
    programName: 'Program Name',
    programType: 'Program Type',
    department: 'Department',
    location: 'Location',
    status: 'Status',
    deadline: 'Deadline',
    preferredDeadline: 'Preferred Deadline',
    decisionDeadline: 'Decision Deadline',
    admissionTerm: 'Admission Term',
    admissionYear: 'Admission Year',
    applicationFee: 'Application Fee',
    feeWaiverStatus: 'Fee Waiver Status',
    universityRanking: 'University Ranking',
    departmentRanking: 'Department Ranking',
    isR1: 'Is R1',
    admissionChance: 'Admission Chance',
    tags: 'Tags',
    portalLink: 'Portal Link',
    notes: 'Notes',
    cv: 'CV Status',
    statementOfPurpose: 'SOP Status',
    transcripts: 'Transcripts Status',
    lor1: 'LOR 1 Status',
    lor2: 'LOR 2 Status',
    lor3: 'LOR 3 Status',
    writingSample: 'Writing Sample Status',
    greStatus: 'GRE Status',
    englishTestType: 'English Test Type',
    englishTestStatus: 'English Test Status',
    facultyContacts: 'Faculty Contacts',
    recommenders: 'Recommenders',
    preferredFaculty: 'Preferred Faculty',
  };

  return labels[fieldId] || fieldId;
};
