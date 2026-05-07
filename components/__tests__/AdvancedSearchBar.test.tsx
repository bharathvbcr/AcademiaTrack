import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdvancedSearchBar from '../AdvancedSearchBar';
import { Application, ApplicationStatus, ApplicationFeeWaiverStatus, DocumentStatus, ProgramType, TestStatus } from '../../types';

const app = (overrides: Partial<Application>): Application => ({
  id: 'app-1',
  universityName: 'MIT',
  programName: 'Computer Science',
  programType: ProgramType.PhD,
  department: 'EECS',
  location: 'Cambridge',
  isR1: true,
  universityRanking: '',
  departmentRanking: '',
  status: ApplicationStatus.NotStarted,
  deadline: null,
  preferredDeadline: null,
  admissionTerm: null,
  admissionYear: null,
  applicationFee: 0,
  feeWaiverStatus: ApplicationFeeWaiverStatus.NotRequested,
  portalLink: '',
  documents: {
    cv: { required: true, status: DocumentStatus.NotStarted, submitted: null },
    statementOfPurpose: { required: true, status: DocumentStatus.NotStarted, submitted: null },
    transcripts: { required: true, status: DocumentStatus.NotStarted, submitted: null },
    lor1: { required: false, status: DocumentStatus.NotStarted, submitted: null },
    lor2: { required: false, status: DocumentStatus.NotStarted, submitted: null },
    lor3: { required: false, status: DocumentStatus.NotStarted, submitted: null },
    writingSample: { required: false, status: DocumentStatus.NotStarted, submitted: null },
  },
  gre: { status: TestStatus.NotApplicable },
  englishTest: { type: 'Not Required', status: TestStatus.NotApplicable },
  facultyContacts: [],
  recommenders: [],
  reminders: [],
  notes: '',
  customFields: {},
  ...overrides,
});

describe('AdvancedSearchBar', () => {
  it('reports an active zero-result search with the query', async () => {
    const onSearch = vi.fn();

    render(<AdvancedSearchBar applications={[app({})]} onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'zzzz' } });

    await waitFor(() => {
      expect(onSearch).toHaveBeenLastCalledWith([], 'zzzz');
    });
  });
});
