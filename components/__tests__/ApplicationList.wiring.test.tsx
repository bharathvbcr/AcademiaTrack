import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ApplicationList from '../ApplicationList';
import { Application, ApplicationStatus, ApplicationFeeWaiverStatus, DocumentStatus, ProgramType, TestStatus } from '../../types';

const makeApp = (): Application => ({
  id: 'app-1',
  universityName: 'Test University',
  programName: 'Test Program',
  programType: ProgramType.PhD,
  department: 'Computer Science',
  location: 'Test City',
  isR1: false,
  universityRanking: '',
  departmentRanking: '',
  status: ApplicationStatus.NotStarted,
  deadline: null,
  preferredDeadline: null,
  admissionTerm: null,
  admissionYear: null,
  applicationFee: 75,
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
  tags: ['target'],
  customFields: {},
});

const baseProps = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onUpdate: vi.fn(),
  onDuplicate: vi.fn(),
  hasActiveFilter: false,
};

describe('ApplicationList wiring', () => {
  it('opens the context menu and executes status changes', () => {
    const onUpdate = vi.fn();
    render(<ApplicationList {...baseProps} onUpdate={onUpdate} applications={[makeApp()]} />);

    fireEvent.contextMenu(screen.getByRole('button', { name: /Application for Test University/i }));
    fireEvent.click(screen.getByText('Change Status'));
    fireEvent.click(screen.getByText('Submitted'));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'app-1',
      status: ApplicationStatus.Submitted,
    }));
  });

  it('honors configured visible card fields', () => {
    render(
      <ApplicationList
        {...baseProps}
        applications={[makeApp()]}
        visibleColumns={['universityName', 'status']}
      />
    );

    expect(screen.getByText('Test University')).toBeInTheDocument();
    expect(screen.queryByText('Test Program')).not.toBeInTheDocument();
    expect(screen.queryByText('$75')).not.toBeInTheDocument();
  });
});
