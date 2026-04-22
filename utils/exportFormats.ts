import { Application } from '../types';
import { getFieldLabel, getFieldValue } from './exportFields';

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
