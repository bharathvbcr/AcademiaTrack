import { describe, expect, it } from 'vitest';
import { parseCSV } from '../../utils';

describe('parseCSV round-trip fidelity', () => {
  it('maps the primary Status column and is not overwritten by document/test status columns', () => {
    // Column order mirrors exportToCSV: the "Status" column precedes the
    // per-document "* Status" columns. The bug was that `header.includes('status')`
    // let "CV Status" overwrite the application status.
    const csv = [
      'University Name,Program Type,Status,CV Status,GRE Status',
      'MIT,Masters,Submitted,In Progress,Taken',
    ].join('\n');

    const [app] = parseCSV(csv);

    expect(app.universityName).toBe('MIT');
    expect(app.status).toBe('Submitted'); // not "In Progress" from CV Status
    expect(app.programType).toBe('Masters'); // not hardcoded "PhD"
    expect(app.documents?.cv.status).toBe('In Progress');
    expect(app.gre?.status).toBe('Taken');
  });

  it('preserves document statuses for every document column', () => {
    const csv = [
      'University Name,Status,CV Status,SOP Status,Transcripts Status,LOR 1 Status,Writing Sample Status',
      'Stanford,Accepted,Submitted,Completed,Submitted,Not Started,In Progress',
    ].join('\n');

    const [app] = parseCSV(csv);

    expect(app.status).toBe('Accepted');
    expect(app.documents?.cv.status).toBe('Submitted');
    expect(app.documents?.statementOfPurpose.status).toBe('Completed');
    expect(app.documents?.transcripts.status).toBe('Submitted');
    expect(app.documents?.lor1.status).toBe('Not Started');
    expect(app.documents?.writingSample.status).toBe('In Progress');
  });

  it('parses preferred deadline separately from the main deadline', () => {
    const csv = [
      'University Name,Deadline,Preferred Deadline',
      'Berkeley,2026-12-01,2026-11-15',
    ].join('\n');

    const [app] = parseCSV(csv);

    expect(app.deadline).toBe('2026-12-01');
    expect(app.preferredDeadline).toBe('2026-11-15');
  });
});
