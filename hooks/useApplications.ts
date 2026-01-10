import React, { useState, useEffect } from 'react';
import { Application, FacultyContact, ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, ProgramType, DocumentStatus } from '../types';
import { useDebounce } from './useDebounce';
import { migrateData, wrapInSchema, createEmptyDataSchema } from '../utils/dataMigration';
import { useUndoRedo } from './useUndoRedo';

export const useApplications = () => {
  const { state: applications, setState: setApplications, undo, redo, canUndo, canRedo, reset } = useUndoRedo<Application[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const debouncedApplications = useDebounce(applications, 1000);

  // Load data on mount
  useEffect(() => {
    const loadApplications = async () => {
      if (window.electron) {
        const rawData = await window.electron.loadData();
        if (rawData) {
          // Migrate data from any version to current version
          const migratedData = migrateData(rawData);
          reset(migratedData.applications);
        }
      } else {
        // Fallback for web-only dev
        const saved = localStorage.getItem('phd-applications');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            // Migrate data from any version to current version
            const migratedData = migrateData(parsed);
            reset(migratedData.applications);
          } catch (e) {
            console.error('Failed to parse saved applications', e);
          }
        }
      }
      setIsLoaded(true);
    };
    loadApplications();
  }, []);

  // Save data whenever debounced applications change
  useEffect(() => {
    if (!isLoaded) return;

    // Wrap applications in versioned schema before saving
    const dataToSave = wrapInSchema(debouncedApplications);

    if (window.electron) {
      window.electron.saveData(dataToSave);
    } else {
      localStorage.setItem('phd-applications', JSON.stringify(dataToSave));
    }
  }, [debouncedApplications, isLoaded]);

  // Periodic deadline check
  // Keep a ref to applications for the interval to access the latest state without resetting
  const applicationsRef = React.useRef(applications);

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  // Periodic deadline check
  useEffect(() => {
    if (!isLoaded) return;

    // Check immediately on load
    checkDeadlines(applicationsRef.current);

    const interval = setInterval(() => {
      checkDeadlines(applicationsRef.current);
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [isLoaded]);

  const checkDeadlines = (apps: Application[]) => {
    const today = new Date();
    apps.forEach(app => {
      if (app.deadline && app.status !== ApplicationStatus.Submitted) {
        const deadlineDate = new Date(app.deadline);
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
          const timeString = diffDays === 7 ? '1 week' : `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
          window.electron.showNotification(
            'Upcoming Deadline',
            `Application for ${app.universityName} is due in ${timeString}!`
          );
        }
      }
    });
  };

  const addApplication = (app: Omit<Application, 'id'>) => {
    const newApplication = { ...app, id: crypto.randomUUID() };
    setApplications(apps => [...apps, newApplication]);
  };

  const updateApplication = (updatedApp: Application) => {
    setApplications(apps => apps.map(app => app.id === updatedApp.id ? updatedApp : app));
  };

  const deleteApplication = (id: string) => {
    setApplications(apps => apps.filter(app => app.id !== id));
  };

  const duplicateApplication = (id: string) => {
    const appToDuplicate = applications.find(app => app.id === id);
    if (!appToDuplicate) return;

    // Deep copy to avoid reference issues
    const newApp: Application = JSON.parse(JSON.stringify(appToDuplicate));

    newApp.id = crypto.randomUUID();
    newApp.universityName = `${newApp.universityName} (Copy)`;
    newApp.status = ApplicationStatus.NotStarted;

    // Reset document statuses
    Object.keys(newApp.documents).forEach(key => {
      const docKey = key as keyof typeof newApp.documents;
      if (newApp.documents[docKey]) {
        newApp.documents[docKey].status = DocumentStatus.NotStarted;
        newApp.documents[docKey].submitted = null;
      }
    });

    setApplications(apps => [...apps, newApp]);
    if (window.electron) window.electron.showNotification('Success', 'Application duplicated successfully');
  };

  const addFacultyContact = (contact: FacultyContact, universityName: string, isNewUniversity: boolean, defaultProgramType: ProgramType) => {
    if (isNewUniversity) {
      const newApplication: Application = {
        id: crypto.randomUUID(),
        universityName: universityName,
        programName: 'N/A',
        programType: defaultProgramType,
        status: ApplicationStatus.NotStarted,
        facultyContacts: [contact],
        // Fill in other fields with default values
        department: '',
        location: '',
        isR1: false,
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
        gre: { status: TestStatus.NotApplicable },
        englishTest: { type: 'Not Required', status: TestStatus.NotApplicable },
        preferredFaculty: '',
        notes: '',
        reminders: [],
        customProgramType: '',
      };
      setApplications(apps => [...apps, newApplication]);
    } else {
      // Case-insensitive search for existing application
      const appToUpdate = applications.find(app => app.universityName.toLowerCase() === universityName.toLowerCase());
      if (appToUpdate) {
        const updatedApp = {
          ...appToUpdate,
          facultyContacts: [...appToUpdate.facultyContacts, contact],
        };
        setApplications(apps => apps.map(app => app.id === updatedApp.id ? updatedApp : app));
      } else {
        if (window.electron) {
          window.electron.showNotification('Error', `Could not find an application for "${universityName}". Please add an application for this university first.`);
        } else {
          console.warn(`Could not find an application for "${universityName}".`);
        }
      }
    }
  };

  const importApplications = (newApps: Application[]) => {
    setApplications(newApps);
  };

  const mergeApplications = (newApps: Application[]) => {
    setApplications(apps => [...apps, ...newApps]);
  };

  return {
    applications,
    addApplication,
    updateApplication,
    deleteApplication,
    duplicateApplication,
    addFacultyContact,
    importApplications,
    mergeApplications,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
