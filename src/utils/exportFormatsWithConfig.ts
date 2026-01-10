import { Application } from '../types';
import { ExportConfig, EXPORT_FIELDS, getFieldValue } from '../types/exportConfig';

const escapeCsvCell = (cell: string | number | boolean | null | undefined): string => {
  const cellStr = String(cell === null || cell === undefined ? '' : cell);
  if (/[",\n]/.test(cellStr)) {
    return `"${cellStr.replace(/"/g, '""')}"`;
  }
  return cellStr;
};

export const exportToCSVWithConfig = (applications: Application[], config: ExportConfig) => {
  // Get selected fields
  const selectedFields = EXPORT_FIELDS.filter(f => config.selectedFields.includes(f.id));
  
  // Build headers
  const headers = selectedFields.map(f => f.label);
  
  // Build rows
  const rows = applications.map(app => {
    return selectedFields.map(field => {
      const value = getFieldValue(app, field.path);
      const formatted = field.formatter ? field.formatter(value) : value;
      return escapeCsvCell(formatted);
    });
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `applications-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToMarkdownWithConfig = (applications: Application[], config: ExportConfig) => {
  const selectedFields = EXPORT_FIELDS.filter(f => config.selectedFields.includes(f.id));
  
  let markdown = `# Application Tracker Export\n\n`;
  markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
  markdown += `Total Applications: ${applications.length}\n\n`;

  applications.forEach((app, index) => {
    markdown += `## ${index + 1}. ${app.universityName}${app.programName ? ` - ${app.programName}` : ''}\n\n`;
    
    selectedFields.forEach(field => {
      const value = getFieldValue(app, field.path);
      const formatted = field.formatter ? field.formatter(value) : (value || 'N/A');
      markdown += `- **${field.label}:** ${formatted}\n`;
    });
    
    markdown += `\n---\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `applications-${new Date().toISOString().split('T')[0]}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDFWithConfig = async (applications: Application[], config: ExportConfig) => {
  const selectedFields = EXPORT_FIELDS.filter(f => config.selectedFields.includes(f.id));
  
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
            ${selectedFields.map(f => `<th>${f.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${applications.map(app => {
            const cells = selectedFields.map(field => {
              const value = getFieldValue(app, field.path);
              const formatted = field.formatter ? field.formatter(value) : (value || 'N/A');
              return `<td>${formatted}</td>`;
            });
            return `<tr>${cells.join('')}</tr>`;
          }).join('')}
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
