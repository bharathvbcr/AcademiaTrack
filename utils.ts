import { Application } from './types';
import { getFieldLabel, getFieldValue } from './utils/exportFields';

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

export const exportToCSV = (applications: Application[], selectedFields?: string[]) => {
  // Use selected fields or default to all common fields
  const fields = selectedFields || [
    'universityName', 'programName', 'programType', 'department', 'location',
    'status', 'deadline', 'preferredDeadline', 'applicationFee', 'feeWaiverStatus',
    'portalLink', 'universityRanking', 'departmentRanking', 'isR1',
    'cv', 'statementOfPurpose', 'transcripts', 'lor1', 'lor2', 'lor3', 'writingSample',
    'greStatus', 'englishTestType', 'englishTestStatus',
    'facultyContacts', 'preferredFaculty', 'notes'
  ];

  const headers = fields.map(fieldId => getFieldLabel(fieldId));
  const rows = applications.map(app => 
    fields.map(fieldId => {
      const value = getFieldValue(app, fieldId);
      return escapeCsvCell(value);
    })
  );

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
