import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FacultyView from '../FacultyView';
import RecommendersView from '../RecommendersView';
import {
  Application,
  ApplicationFeeWaiverStatus,
  ApplicationStatus,
  DocumentStatus,
  FacultyContactStatus,
  ProgramType,
  RecommenderStatus,
  TestStatus,
} from '../../types';

const application = (): Application => ({
  id: 'app-1',
  universityName: 'Stanford',
  programName: 'CS PhD',
  programType: ProgramType.PhD,
  department: 'CS',
  location: 'Stanford',
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
  facultyContacts: [{
    id: 'faculty-1',
    name: 'Dr. Ada',
    website: '',
    email: 'ada@stanford.edu',
    researchArea: 'ML',
    contactStatus: FacultyContactStatus.NotContacted,
    contactDate: null,
    interviewDate: null,
  }],
  recommenders: [{
    id: 'rec-1',
    name: 'Dr. Grace',
    title: 'Professor',
    email: 'grace@stanford.edu',
    relationship: 'Advisor',
    status: RecommenderStatus.Requested,
    dateRequested: null,
    dateSubmitted: null,
    notes: '',
  }],
  reminders: [],
  notes: '',
});

describe('list row delete', () => {
  it('removes a faculty contact after confirmation', () => {
    const updateApplication = vi.fn();
    render(
      <FacultyView
        applications={[application()]}
        updateApplication={updateApplication}
        openModal={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Dr. Ada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(updateApplication).toHaveBeenCalledWith(expect.objectContaining({
      id: 'app-1',
      facultyContacts: [],
    }));
  });

  it('removes a recommender after confirmation', () => {
    const updateApplication = vi.fn();
    render(
      <RecommendersView
        applications={[application()]}
        updateApplication={updateApplication}
        openModal={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Dr. Grace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(updateApplication).toHaveBeenCalledWith(expect.objectContaining({
      id: 'app-1',
      recommenders: [],
    }));
  });
});
