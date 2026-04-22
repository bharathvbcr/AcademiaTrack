import React, { useState, useEffect } from 'react';
import { Application, FacultyContact, ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, ProgramType, DocumentStatus } from '../types';
import { useDebounce } from './useDebounce';
import { migrateData, wrapInSchema, createEmptyDataSchema } from '../utils/dataMigration';
import { useUndoRedo } from './useUndoRedo';
import { readJsonFromStorage, writeJsonToStorage } from '../utils/browserStorage';

export const useApplications = () => {
  const { state: applications, setState: setApplications, undo, redo, canUndo, canRedo, reset } = useUndoRedo<Application[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const debouncedApplications = useDebounce(applications, 1000);

  // Load data on mount
  useEffect(() => {
    const loadApplications = async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          if (window.desktop) {
            const rawData = await window.desktop.loadData();
            if (rawData) {
              // Migrate data from any version to current version
              const migratedData = migrateData(rawData);
              reset(migratedData.applications);
            }
          } else {
            // Fallback for web-only dev
            const saved = readJsonFromStorage<unknown>('phd-applications');
            if (saved !== null) {
              // Migrate data from any version to current version
              const migratedData = migrateData(saved);
              reset(migratedData.applications);
            }
          }
          setIsLoaded(true);
          return; // Success, exit retry loop
        } catch (e) {
          console.error(`Failed to load applications (${4 - retries}/3):`, e);
          retries--;
          if (retries === 0) {
            console.error('Failed to load applications after retries, starting with empty state');
            setIsLoaded(true);
            return;
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }
    };
    loadApplications();
  }, []);

  // Save data whenever debounced applications change
  useEffect(() => {
    if (!isLoaded) return;

    const saveData = async () => {
      try {
        // Wrap applications in versioned schema before saving
        const dataToSave = wrapInSchema(debouncedApplications);

        if (window.desktop) {
          await window.desktop.saveData(dataToSave);
        } else {
          writeJsonToStorage('phd-applications', dataToSave);
        }
      } catch (error) {
        console.error('Failed to save applications:', error);
        // Retry once after a short delay
        setTimeout(() => {
          try {
            const dataToSave = wrapInSchema(debouncedApplications);
            if (window.desktop) {
              window.desktop.saveData(dataToSave).catch(e => {
                console.error('Retry save also failed:', e);
              });
            } else {
              writeJsonToStorage('phd-applications', dataToSave);
            }
          } catch (retryError) {
            console.error('Retry save failed:', retryError);
          }
        }, 1000);
      }
    };

    saveData();
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
          window.desktop?.showNotification(
            'Upcoming Deadline',
            `Application for ${app.universityName} is due in ${timeString}!`
          );
        }
      }
    });
  };

  const addApplication = (app: Omit<Application, 'id'>) => {
    try {
      const newApplication = { ...app, id: crypto.randomUUID() };
      setApplications(apps => [...apps, newApplication]);
    } catch (error) {
      console.error('Failed to add application:', error);
      throw new Error('Failed to add application. Please try again.');
    }
  };

  const updateApplication = (updatedApp: Application) => {
    try {
      setApplications(apps => {
        const index = apps.findIndex(app => app.id === updatedApp.id);
        if (index === -1) {
          console.warn(`Application with id ${updatedApp.id} not found for update`);
          return apps;
        }
        return apps.map(app => app.id === updatedApp.id ? updatedApp : app);
      });
    } catch (error) {
      console.error('Failed to update application:', error);
      throw new Error('Failed to update application. Please try again.');
    }
  };

  const deleteApplication = (id: string) => {
    try {
      setApplications(apps => {
        const exists = apps.some(app => app.id === id);
        if (!exists) {
          console.warn(`Application with id ${id} not found for deletion`);
          return apps;
        }
        return apps.filter(app => app.id !== id);
      });
    } catch (error) {
      console.error('Failed to delete application:', error);
      throw new Error('Failed to delete application. Please try again.');
    }
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
    window.desktop?.showNotification('Success', 'Application duplicated successfully');
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
        if (window.desktop) {
          window.desktop.showNotification('Error', `Could not find an application for "${universityName}". Please add an application for this university first.`);
        } else {
          console.warn(`Could not find an application for "${universityName}".`);
        }
      }
    }
  };

  const importApplications = (newApps: Application[]) => {
    try {
      // Validate imported data
      if (!Array.isArray(newApps)) {
        throw new Error('Imported data must be an array of applications');
      }
      // Basic validation - ensure each app has required fields
      const validApps = newApps.filter(app => {
        if (!app || typeof app !== 'object') return false;
        if (!app.id || !app.universityName || !app.programName) {
          console.warn('Skipping invalid application:', app);
          return false;
        }
        return true;
      });
      if (validApps.length === 0 && newApps.length > 0) {
        throw new Error('No valid applications found in imported data');
      }
      reset(validApps);
    } catch (error) {
      console.error('Failed to import applications:', error);
      throw error instanceof Error ? error : new Error('Failed to import applications. Please check the data format.');
    }
  };

  const mergeApplications = (newApps: Application[]) => {
    try {
      if (!Array.isArray(newApps)) {
        throw new Error('Merged data must be an array of applications');
      }
      // Validate and filter valid applications
      const validApps = newApps.filter(app => {
        if (!app || typeof app !== 'object') return false;
        // For merge, we can be more lenient - just need university name
        if (!app.universityName) {
          console.warn('Skipping application without university name:', app);
          return false;
        }
        // Generate ID if missing
        if (!app.id) {
          app.id = crypto.randomUUID();
        }
        return true;
      });
      setApplications(apps => [...apps, ...validApps]);
    } catch (error) {
      console.error('Failed to merge applications:', error);
      throw error instanceof Error ? error : new Error('Failed to merge applications. Please check the data format.');
    }
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
