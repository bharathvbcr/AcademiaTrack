import { Application } from './types';

// Helper function to escape CSV cell content
const escapeCsvCell = (cell: any): string => {
  const cellStr = String(cell === null || cell === undefined ? '' : cell);
  // If the string contains a comma, double quote, or newline, wrap it in double quotes.
  if (/[",\n]/.test(cellStr)) {
    // Also, double up any existing double quotes within the string.
    return `"${cellStr.replace(/"/g, '""')}"`;
  }
  return cellStr;
};

export const exportToCSV = (applications: Application[]) => {
  const headers = [
    'University Name', 'Program Name', 'Program Type', 'Department', 'Location',
    'Status', 'Deadline', 'Preferred Deadline', 'Application Fee', 'Fee Waiver Status',
    'Portal Link', 'University Ranking', 'Department Ranking', 'Is R1',
    'CV Required', 'CV Submitted Date',
    'Statement of Purpose Required', 'Statement of Purpose Submitted Date',
    'Transcripts Required', 'Transcripts Submitted Date',
    'LOR1 Required', 'LOR1 Submitted Date',
    'LOR2 Required', 'LOR2 Submitted Date',
    'LOR3 Required', 'LOR3 Submitted Date',
    'Writing Sample Required', 'Writing Sample Submitted Date',
    'GRE Status', 'English Test Type', 'English Test Status',
    'Faculty Contacts', 'Preferred Faculty', 'Notes'
  ];

  const rows = applications.map(app => {
    const programType = app.programType === 'Other' ? app.customProgramType || 'Other' : app.programType;
    const facultyContacts = (app.facultyContacts || []).map(f => f.name).filter(Boolean).join('; ');

    return [
      app.universityName,
      app.programName,
      programType,
      app.department,
      app.location,
      app.status,
      app.deadline,
      app.preferredDeadline || '',
      app.applicationFee,
      app.feeWaiverStatus,
      app.portalLink,
      app.universityRanking,
      app.departmentRanking,
      app.isR1 ? 'Yes' : 'No',
      app.documents.cv.required ? 'Yes' : 'No',
      app.documents.cv.submitted || '',
      app.documents.statementOfPurpose.required ? 'Yes' : 'No',
      app.documents.statementOfPurpose.submitted || '',
      app.documents.transcripts.required ? 'Yes' : 'No',
      app.documents.transcripts.submitted || '',
      app.documents.lor1.required ? 'Yes' : 'No',
      app.documents.lor1.submitted || '',
      app.documents.lor2.required ? 'Yes' : 'No',
      app.documents.lor2.submitted || '',
      app.documents.lor3.required ? 'Yes' : 'No',
      app.documents.lor3.submitted || '',
      app.documents.writingSample.required ? 'Yes' : 'No',
      app.documents.writingSample.submitted || '',
      app.gre.status,
      app.englishTest.type,
      app.englishTest.status,
      facultyContacts,
      app.preferredFaculty,
      app.notes
    ].map(escapeCsvCell);
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.href) {
    URL.revokeObjectURL(link.href);
  }
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'applications.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
