import { Application } from '../types';

// Field value getters (exported for use in utils.ts)
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

export const exportToMarkdown = (applications: Application[], selectedFields?: string[]): string => {
  const fields = selectedFields || ['universityName', 'programName', 'programType', 'department', 'location', 'status', 'deadline', 'applicationFee', 'tags'];
  
  let markdown = `# Application Tracker Export\n\n`;
  markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
  markdown += `Total Applications: ${applications.length}\n\n`;

  applications.forEach((app, index) => {
    markdown += `## ${index + 1}. ${app.universityName} - ${app.programName}\n\n`;
    
    fields.forEach(fieldId => {
      const value = getFieldValue(app, fieldId);
      if (value !== null && value !== '') {
        markdown += `- **${getFieldLabel(fieldId)}:** ${value}\n`;
      }
    });
    
    markdown += `\n---\n\n`;
  });

  return markdown;
};

export const downloadMarkdown = (applications: Application[], selectedFields?: string[], filename?: string) => {
  const markdown = exportToMarkdown(applications, selectedFields);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename || `applications-${new Date().toISOString().split('T')[0]}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (applications: Application[], selectedFields?: string[], filename?: string) => {
  const fields = selectedFields || ['universityName', 'programName', 'status', 'deadline', 'applicationFee'];
  
  // This would require a PDF library like jsPDF or pdfkit
  // For now, we'll create a simple HTML-based PDF using browser print
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Application Tracker Export</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>Application Tracker Export</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${fields.map(fieldId => `<th>${getFieldLabel(fieldId)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${applications.map(app => `
            <tr>
              ${fields.map(fieldId => `<td>${getFieldValue(app, fieldId) || 'N/A'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
};

export const exportToJSON = (applications: Application[], selectedFields?: string[]): string => {
  // Default fields if none selected
  const defaultFields = ['universityName', 'programName', 'programType', 'department', 'location', 'status', 'deadline', 'applicationFee', 'tags'];
  const fields = selectedFields || defaultFields;
  
  const data = applications.map(app => {
    const obj: Record<string, any> = {};
    fields.forEach(fieldId => {
      obj[getFieldLabel(fieldId)] = getFieldValue(app, fieldId);
    });
    return obj;
  });

  return JSON.stringify(data, null, 2);
};
