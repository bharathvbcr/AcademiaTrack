import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApplications } from '../useApplications';
import {
  ApplicationFeeWaiverStatus,
  ApplicationStatus,
  DocumentStatus,
  ProgramType,
  TestStatus,
} from '../../types/enums';

const createApplication = () => ({
  universityName: 'MIT',
  programName: 'CS PhD',
  programType: ProgramType.PhD,
  status: ApplicationStatus.NotStarted,
  department: 'CS',
  location: 'Cambridge, MA',
  isR1: true,
  universityRanking: '',
  departmentRanking: '',
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
  facultyContacts: [],
  notes: '',
  reminders: [],
  englishTest: { type: 'Not Required', status: TestStatus.NotApplicable },
  gre: { status: TestStatus.NotApplicable },
});

describe('useApplications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete window.desktop;
  });

  it('does not autosave an empty overwrite after repeated startup load failures', async () => {
    const loadData = vi.fn().mockRejectedValue(new Error('load failed'));
    const saveData = vi.fn().mockResolvedValue(undefined);
    const autoBackup = vi.fn().mockResolvedValue({ success: true });

    window.desktop = {
      loadData,
      saveData,
      autoBackup,
      showNotification: vi.fn(),
    } as any;

    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useApplications());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
      await Promise.resolve();
    });

    expect(loadData).toHaveBeenCalledTimes(3);
    expect(saveData).not.toHaveBeenCalled();
    expect(autoBackup).not.toHaveBeenCalled();
  });

  it('re-enables autosave after an explicit user mutation following a failed startup load', async () => {
    const loadData = vi.fn().mockRejectedValue(new Error('load failed'));
    const saveData = vi.fn().mockResolvedValue(undefined);
    const autoBackup = vi.fn().mockResolvedValue({ success: true });

    window.desktop = {
      loadData,
      saveData,
      autoBackup,
      showNotification: vi.fn(),
    } as any;

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useApplications());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
      await Promise.resolve();
    });

    expect(loadData).toHaveBeenCalledTimes(3);

    act(() => {
      result.current.addApplication(createApplication());
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });

    expect(saveData).toHaveBeenCalledTimes(1);
    expect(autoBackup).toHaveBeenCalledTimes(1);
  });

  it('removes every program at a university in one undo step', () => {
    localStorage.clear();
    const { result } = renderHook(() => useApplications());

    act(() => {
      result.current.addApplication({ ...createApplication(), universityName: 'Stanford', programName: 'CS' });
      result.current.addApplication({ ...createApplication(), universityName: 'Stanford', programName: 'EE' });
      result.current.addApplication({ ...createApplication(), universityName: 'MIT', programName: 'CS' });
    });

    const stanfordIds = result.current.applications
      .filter(app => app.universityName === 'Stanford')
      .map(app => app.id);

    let removed = 0;
    act(() => {
      removed = result.current.deleteApplications(stanfordIds);
    });

    expect(removed).toBe(2);
    expect(result.current.applications.map(app => app.universityName)).toEqual(['MIT']);

    act(() => {
      result.current.undo();
    });

    expect(result.current.applications.filter(app => app.universityName === 'Stanford')).toHaveLength(2);
    expect(result.current.applications).toHaveLength(3);
  });

  it('renames every program at a university in one undo step and ignores an unchanged batch', () => {
    localStorage.clear();
    const { result } = renderHook(() => useApplications());

    act(() => {
      result.current.addApplication({ ...createApplication(), universityName: 'Stanford', programName: 'CS' });
      result.current.addApplication({ ...createApplication(), universityName: 'Stanford', programName: 'EE' });
      result.current.addApplication({ ...createApplication(), universityName: 'MIT', programName: 'CS' });
    });

    const unchanged = result.current.replaceApplications([result.current.applications[0]]);
    expect(unchanged).toBe(0);

    const renamed = result.current.applications
      .filter(app => app.universityName === 'Stanford')
      .map(app => ({ ...app, universityName: 'Leland Stanford' }));

    let changed = 0;
    act(() => {
      changed = result.current.replaceApplications(renamed);
    });

    expect(changed).toBe(2);
    expect(result.current.applications.map(app => app.universityName)).toEqual(['Leland Stanford', 'Leland Stanford', 'MIT']);

    act(() => {
      result.current.undo();
    });

    expect(result.current.applications.map(app => app.universityName)).toEqual(['Stanford', 'Stanford', 'MIT']);
  });
});
