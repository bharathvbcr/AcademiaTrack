export type ExportFieldCategory = 
  | 'basic'
  | 'status'
  | 'financial'
  | 'documents'
  | 'faculty'
  | 'recommenders'
  | 'essays'
  | 'custom'
  | 'metadata';

export interface ExportField {
  id: string;
  label: string;
  category: ExportFieldCategory;
  path: string; // Path to access the value, e.g., 'universityName', 'documents.cv.status'
  formatter?: (value: any) => string;
}

export interface ExportConfig {
  selectedFields: string[]; // Array of field IDs
  includeHeaders: boolean;
}

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  fields: string[]; // Field IDs
}

// Define all available export fields
export const EXPORT_FIELDS: ExportField[] = [
  // Basic Info
  { id: 'universityName', label: 'University Name', category: 'basic', path: 'universityName' },
  { id: 'programName', label: 'Program Name', category: 'basic', path: 'programName' },
  { id: 'programType', label: 'Program Type', category: 'basic', path: 'programType' },
  { id: 'department', label: 'Department', category: 'basic', path: 'department' },
  { id: 'location', label: 'Location', category: 'basic', path: 'location' },
  { id: 'admissionTerm', label: 'Admission Term', category: 'basic', path: 'admissionTerm' },
  { id: 'admissionYear', label: 'Admission Year', category: 'basic', path: 'admissionYear' },
  
  // Status & Deadlines
  { id: 'status', label: 'Status', category: 'status', path: 'status' },
  { id: 'deadline', label: 'Deadline', category: 'status', path: 'deadline' },
  { id: 'preferredDeadline', label: 'Preferred Deadline', category: 'status', path: 'preferredDeadline' },
  { id: 'decisionDeadline', label: 'Decision Deadline', category: 'status', path: 'decisionDeadline' },
  
  // Financial
  { id: 'applicationFee', label: 'Application Fee', category: 'financial', path: 'applicationFee' },
  { id: 'feeWaiverStatus', label: 'Fee Waiver Status', category: 'financial', path: 'feeWaiverStatus' },
  { id: 'financialOffer', label: 'Financial Offer', category: 'financial', path: 'financialOffer.received', formatter: (v) => v ? 'Yes' : 'No' },
  { id: 'stipendAmount', label: 'Stipend Amount', category: 'financial', path: 'financialOffer.stipendAmount' },
  { id: 'tuitionWaiver', label: 'Tuition Waiver %', category: 'financial', path: 'financialOffer.tuitionWaiver' },
  
  // Documents
  { id: 'cvStatus', label: 'CV Status', category: 'documents', path: 'documents.cv.status' },
  { id: 'cvSubmitted', label: 'CV Submitted Date', category: 'documents', path: 'documents.cv.submitted' },
  { id: 'sopStatus', label: 'SOP Status', category: 'documents', path: 'documents.statementOfPurpose.status' },
  { id: 'sopSubmitted', label: 'SOP Submitted Date', category: 'documents', path: 'documents.statementOfPurpose.submitted' },
  { id: 'transcriptsStatus', label: 'Transcripts Status', category: 'documents', path: 'documents.transcripts.status' },
  { id: 'transcriptsSubmitted', label: 'Transcripts Submitted Date', category: 'documents', path: 'documents.transcripts.submitted' },
  { id: 'lor1Status', label: 'LOR1 Status', category: 'documents', path: 'documents.lor1.status' },
  { id: 'lor1Submitted', label: 'LOR1 Submitted Date', category: 'documents', path: 'documents.lor1.submitted' },
  { id: 'lor2Status', label: 'LOR2 Status', category: 'documents', path: 'documents.lor2.status' },
  { id: 'lor2Submitted', label: 'LOR2 Submitted Date', category: 'documents', path: 'documents.lor2.submitted' },
  { id: 'lor3Status', label: 'LOR3 Status', category: 'documents', path: 'documents.lor3.status' },
  { id: 'lor3Submitted', label: 'LOR3 Submitted Date', category: 'documents', path: 'documents.lor3.submitted' },
  
  // Faculty
  { id: 'facultyContacts', label: 'Faculty Contacts', category: 'faculty', path: 'facultyContacts', formatter: (v) => (v || []).map((f: any) => f.name).join('; ') },
  { id: 'preferredFaculty', label: 'Preferred Faculty', category: 'faculty', path: 'preferredFaculty' },
  
  // Recommenders
  { id: 'recommenders', label: 'Recommenders', category: 'recommenders', path: 'recommenders', formatter: (v) => (v || []).map((r: any) => r.name).join('; ') },
  { id: 'recommenderStatus', label: 'Recommender Status', category: 'recommenders', path: 'recommenders', formatter: (v) => (v || []).map((r: any) => `${r.name}: ${r.status}`).join('; ') },
  
  // Metadata
  { id: 'universityRanking', label: 'University Ranking', category: 'metadata', path: 'universityRanking' },
  { id: 'departmentRanking', label: 'Department Ranking', category: 'metadata', path: 'departmentRanking' },
  { id: 'isR1', label: 'Is R1', category: 'metadata', path: 'isR1', formatter: (v) => v ? 'Yes' : 'No' },
  { id: 'tags', label: 'Tags', category: 'metadata', path: 'tags', formatter: (v) => (v || []).join(', ') },
  { id: 'admissionChance', label: 'Admission Chance %', category: 'metadata', path: 'admissionChance' },
  { id: 'portalLink', label: 'Portal Link', category: 'metadata', path: 'portalLink' },
  { id: 'notes', label: 'Notes', category: 'metadata', path: 'notes' },
];

// Default presets
export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'all',
    name: 'All Fields',
    description: 'Export all available fields',
    fields: EXPORT_FIELDS.map(f => f.id),
  },
  {
    id: 'basic',
    name: 'Basic Info Only',
    description: 'University, program, status, and deadlines',
    fields: ['universityName', 'programName', 'programType', 'status', 'deadline', 'location'],
  },
  {
    id: 'financial',
    name: 'Financial Summary',
    description: 'Fees, waivers, and financial offers',
    fields: ['universityName', 'programName', 'applicationFee', 'feeWaiverStatus', 'financialOffer', 'stipendAmount', 'tuitionWaiver'],
  },
  {
    id: 'recommenders',
    name: 'Recommender Status',
    description: 'Recommender information and status',
    fields: ['universityName', 'programName', 'recommenders', 'recommenderStatus'],
  },
  {
    id: 'documents',
    name: 'Document Checklist',
    description: 'Document requirements and submission status',
    fields: ['universityName', 'programName', 'cvStatus', 'cvSubmitted', 'sopStatus', 'sopSubmitted', 'transcriptsStatus', 'transcriptsSubmitted', 'lor1Status', 'lor1Submitted', 'lor2Status', 'lor2Submitted', 'lor3Status', 'lor3Submitted'],
  },
  {
    id: 'status',
    name: 'Status Report',
    description: 'Application status and key dates',
    fields: ['universityName', 'programName', 'status', 'deadline', 'preferredDeadline', 'decisionDeadline', 'admissionTerm', 'admissionYear'],
  },
];

// Helper to get field value from application using path
export const getFieldValue = (app: any, path: string): any => {
  const parts = path.split('.');
  let value = app;
  for (const part of parts) {
    if (value === null || value === undefined) return null;
    value = value[part];
  }
  return value;
};
