import { Application } from '../types';

export const exportToMarkdown = (applications: Application[]): string => {
  let markdown = `# Application Tracker Export\n\n`;
  markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
  markdown += `Total Applications: ${applications.length}\n\n`;

  applications.forEach((app, index) => {
    markdown += `## ${index + 1}. ${app.universityName} - ${app.programName}\n\n`;
    markdown += `- **Program Type:** ${app.programType}\n`;
    markdown += `- **Department:** ${app.department}\n`;
    markdown += `- **Location:** ${app.location}\n`;
    markdown += `- **Status:** ${app.status}\n`;
    markdown += `- **Deadline:** ${app.deadline || 'N/A'}\n`;
    markdown += `- **Application Fee:** $${app.applicationFee}\n`;
    if (app.tags && app.tags.length > 0) {
      markdown += `- **Tags:** ${app.tags.join(', ')}\n`;
    }
    if (app.notes) {
      markdown += `\n### Notes\n\n${app.notes}\n\n`;
    }
    markdown += `\n---\n\n`;
  });

  return markdown;
};

export const downloadMarkdown = (applications: Application[], filename?: string) => {
  const markdown = exportToMarkdown(applications);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename || `applications-${new Date().toISOString().split('T')[0]}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (applications: Application[], filename?: string) => {
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
            <th>University</th>
            <th>Program</th>
            <th>Status</th>
            <th>Deadline</th>
            <th>Fee</th>
          </tr>
        </thead>
        <tbody>
          ${applications.map(app => `
            <tr>
              <td>${app.universityName}</td>
              <td>${app.programName}</td>
              <td>${app.status}</td>
              <td>${app.deadline || 'N/A'}</td>
              <td>$${app.applicationFee}</td>
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
