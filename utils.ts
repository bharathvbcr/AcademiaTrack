import { Application } from './types';

// Helper function to escape CSV cell content
const escapeCsvCell = (cell: string | number | boolean | null | undefined): string => {
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

export const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export const sanitizeURL = (url: string): string => {
  if (!url) {
    return '';
  }
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('mailto:')) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
};

export const parseCSV = (csvText: string): Partial<Application>[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const results: Partial<Application>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const app: any = {
      id: crypto.randomUUID(),
      documents: {
        cv: { required: true, status: 'Not Started', submitted: null },
        statementOfPurpose: { required: true, status: 'Not Started', submitted: null },
        transcripts: { required: true, status: 'Not Started', submitted: null },
        lor1: { required: false, status: 'Not Started', submitted: null },
        lor2: { required: false, status: 'Not Started', submitted: null },
        lor3: { required: false, status: 'Not Started', submitted: null },
        writingSample: { required: false, status: 'Not Started', submitted: null },
      },
      facultyContacts: [],
      reminders: [],
      status: 'Not Started', // Date will be set later if found
      programType: 'PhD',
      applicationFee: 0,
      feeWaiverStatus: 'Not Requested',
      isR1: false,
    };

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (!value) return;

      if (header.includes('university') || header === 'name') {
        app.universityName = value;
      } else if (header.includes('program') && !header.includes('type')) {
        app.programName = value;
      } else if (header.includes('status')) {
        // Simple mapping
        const lowerVal = value.toLowerCase();
        if (lowerVal.includes('subm')) app.status = 'Submitted';
        else if (lowerVal.includes('accept')) app.status = 'Accepted';
        else if (lowerVal.includes('reject')) app.status = 'Rejected';
        else if (lowerVal.includes('wait')) app.status = 'Waitlisted';
        else if (lowerVal.includes('start')) app.status = 'In Progress';
        else app.status = 'Not Started';
      } else if (header.includes('deadline')) {
        app.deadline = value;
      } else if (header.includes('fee') && !header.includes('waiver')) {
        app.applicationFee = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
      } else if (header.includes('link') || header.includes('portal')) {
        app.portalLink = sanitizeURL(value);
      } else if (header.includes('note')) {
        app.notes = value;
      }
    });

    if (app.universityName) {
      results.push(app);
    }
  }

  return results;
};

// Helper for CSV line parsing handling quotes
const parseCSVLine = (text: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};
