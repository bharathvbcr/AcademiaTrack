import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    localStorage.removeItem('list-collapsed-universities');
  });

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

  it('deletes one application from the card and from the keyboard', () => {
    const onDelete = vi.fn();
    render(<ApplicationList {...baseProps} onDelete={onDelete} applications={[makeApp()]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete application' }));
    expect(onDelete).toHaveBeenCalledWith('app-1');

    fireEvent.keyDown(screen.getByRole('button', { name: /Application for Test University/i }), { key: 'Delete' });
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it('deletes a university from the grouped list and the context menu', () => {
    const onDeleteUniversity = vi.fn();
    const second = { ...makeApp(), id: 'app-2', programName: 'Robotics' };
    render(
      <ApplicationList
        {...baseProps}
        onDeleteUniversity={onDeleteUniversity}
        groupByUniversity
        applications={[makeApp(), second]}
      />
    );

    expect(screen.getByText('2 programs · Not Started')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Test University' }));
    expect(onDeleteUniversity).toHaveBeenCalledWith('Test University');

    fireEvent.contextMenu(screen.getAllByRole('button', { name: /Application for Test University/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete university (2)' }));
    expect(onDeleteUniversity).toHaveBeenCalledTimes(2);
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

  it('renames and sets status for a university from the header and the context menu', () => {
    const onRenameUniversity = vi.fn();
    const onSetUniversityStatus = vi.fn();
    const second = { ...makeApp(), id: 'app-2', programName: 'Robotics' };
    render(
      <ApplicationList
        {...baseProps}
        groupByUniversity
        onRenameUniversity={onRenameUniversity}
        onSetUniversityStatus={onSetUniversityStatus}
        applications={[makeApp(), second]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rename Test University' }));
    expect(onRenameUniversity).toHaveBeenCalledWith('Test University');

    fireEvent.click(screen.getByRole('button', { name: 'Set status for Test University' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Submitted' }));
    expect(onSetUniversityStatus).toHaveBeenCalledWith('Test University', ApplicationStatus.Submitted);

    fireEvent.contextMenu(screen.getAllByRole('button', { name: /Application for Test University/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Rename university' }));
    expect(onRenameUniversity).toHaveBeenCalledTimes(2);

    fireEvent.contextMenu(screen.getAllByRole('button', { name: /Application for Test University/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'University status (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pursuing' }));
    expect(onSetUniversityStatus).toHaveBeenCalledWith('Test University', ApplicationStatus.Pursuing);
  });

  it('collapses a university group and restores it', () => {
    render(
      <ApplicationList
        {...baseProps}
        groupByUniversity
        applications={[makeApp(), { ...makeApp(), id: 'app-2', universityName: 'Other University', programName: 'Physics' }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Test University' }));
    expect(screen.queryByText('Test Program')).not.toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse universities' }));
    expect(screen.queryByText('Physics')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand universities' }));
    expect(screen.getByText('Test Program')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });
});
