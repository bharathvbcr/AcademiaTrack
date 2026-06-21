import React, { useState, useEffect } from 'react';
import { Application, FacultyContact, ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, ProgramType, DocumentStatus } from '../types';
import { useDebounce } from './useDebounce';
import { migrateData, wrapInSchema, createEmptyDataSchema } from '../utils/dataMigration';
import { useUndoRedo } from './useUndoRedo';
import { getStorageItem, readJsonFromStorage, writeJsonToStorage } from '../utils/browserStorage';
import { getDaysUntil } from '../utils/dateUtils';
import { ToastType } from './useToast';

// Imported records (especially hand-edited or third-party JSON) may be missing
// required nested structures that UI components dereference without guards
// (documents.cv.required, gre, englishTest, facultyContacts, ...). Merge each
// imported app over safe defaults so a partial record degrades gracefully
// instead of crashing the whole view.
const ensureApplicationDefaults = (app: Application): Application => {
  const blankDoc = () => ({ required: false, status: DocumentStatus.NotStarted, submitted: null });
  const existingDocs = (app.documents ?? {}) as Partial<Application['documents']>;
  return {
    ...app,
    facultyContacts: Array.isArray(app.facultyContacts) ? app.facultyContacts : [],
    reminders: Array.isArray(app.reminders) ? app.reminders : [],
    statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
    documents: {
      cv: existingDocs.cv ?? blankDoc(),
      statementOfPurpose: existingDocs.statementOfPurpose ?? blankDoc(),
      transcripts: existingDocs.transcripts ?? blankDoc(),
      lor1: existingDocs.lor1 ?? blankDoc(),
      lor2: existingDocs.lor2 ?? blankDoc(),
      lor3: existingDocs.lor3 ?? blankDoc(),
      writingSample: existingDocs.writingSample ?? blankDoc(),
    },
    gre: app.gre ?? { status: TestStatus.NotApplicable },
    englishTest: app.englishTest ?? { type: 'Not Required', status: TestStatus.NotApplicable },
  };
};

export const useApplications = (showToast?: (type: ToastType, message: string, title?: string) => void) => {
  const { state: applications, setState: setApplications, undo, redo, canUndo, canRedo, reset } = useUndoRedo<Application[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const debouncedApplications = useDebounce(applications, 1000);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;
    const loadApplications = async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          if (window.desktop) {
            const rawData = await window.desktop.loadData();
            if (rawData && isMounted) {
              // Migrate data from any version to current version, then normalize
              // so legacy/partial records can't crash the UI on first render.
              const migratedData = migrateData(rawData);
              reset(migratedData.applications.map(ensureApplicationDefaults));
            }
          } else {
            // Fallback for web-only dev
            const saved = readJsonFromStorage<unknown>('phd-applications');
            if (saved !== null && isMounted) {
              // Migrate data from any version to current version, then normalize.
              const migratedData = migrateData(saved);
              reset(migratedData.applications.map(ensureApplicationDefaults));
            }
          }
          if (isMounted) setIsLoaded(true);
          return; // Success, exit retry loop
        } catch (e) {
          console.error(`Failed to load applications (${4 - retries}/3):`, e);
          retries--;
          if (retries === 0) {
            console.error('Failed to load applications after retries, starting with empty state');
            if (isMounted) setIsLoaded(true);
            return;
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }
    };
    loadApplications();
    return () => { isMounted = false; };
  }, []);

  // Save data whenever debounced applications change
  useEffect(() => {
    if (!isLoaded) return;
    if (debouncedApplications !== applications) return;

    let retryTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const saveData = async () => {
      try {
        if (getStorageItem('auto-save-enabled') === 'false') {
          return;
        }

        // Wrap applications in versioned schema before saving
        const dataToSave = wrapInSchema(debouncedApplications);

        if (window.desktop) {
          await window.desktop.saveData(dataToSave);
          await window.desktop.autoBackup().catch(e => {
            console.error('Automatic backup failed:', e);
          });
        } else {
          try {
            writeJsonToStorage('phd-applications', dataToSave);
          } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
              showToast?.('error', 'Storage is full. Your changes could not be saved. Consider exporting your data.', 'Storage Full');
              return;
            }
            throw e;
          }
        }
      } catch (error) {
        console.error('Failed to save applications:', error);
        // Retry once after a short delay
        retryTimeoutId = setTimeout(() => {
          try {
            const dataToSave = wrapInSchema(debouncedApplications);
            if (window.desktop) {
              window.desktop.saveData(dataToSave)
                .then(() => window.desktop?.autoBackup().catch(e => {
                  console.error('Retry automatic backup failed:', e);
                }))
                .catch(e => {
                  console.error('Retry save also failed:', e);
                });
            } else {
              try {
                writeJsonToStorage('phd-applications', dataToSave);
              } catch (e) {
                if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                  showToast?.('error', 'Storage is full. Your changes could not be saved. Consider exporting your data.', 'Storage Full');
                  return;
                }
                throw e;
              }
            }
          } catch (retryError) {
            console.error('Retry save failed:', retryError);
          }
        }, 1000);
      }
    };

    saveData();

    // Clear a pending retry if deps change or the component unmounts, so the
    // retry can't fire against stale data after this effect is torn down.
    return () => {
      if (retryTimeoutId !== undefined) clearTimeout(retryTimeoutId);
    };
  }, [applications, debouncedApplications, isLoaded, showToast]);

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

  // Remember which (application, deadline, threshold) reminders have already
  // fired so the hourly check doesn't re-notify for the whole day.
  const notifiedDeadlinesRef = React.useRef<Set<string>>(new Set());

  const checkDeadlines = (apps: Application[]) => {
    if (getStorageItem('deadline-notifications-enabled') === 'false') {
      return;
    }

    apps.forEach(app => {
      if (app.deadline && app.status !== ApplicationStatus.Submitted) {
        const diffDays = getDaysUntil(app.deadline);

        if (diffDays !== null && (diffDays === 7 || diffDays === 3 || diffDays === 1)) {
          const key = `${app.id}|${app.deadline}|${diffDays}`;
          if (notifiedDeadlinesRef.current.has(key)) {
            return;
          }
          notifiedDeadlinesRef.current.add(key);

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
      const validApps = newApps.filter((app, index) => {
        if (!app || typeof app !== 'object') return false;
        if (!app.id || !app.universityName || !app.programName) {
          const missing = [!app.id && 'id', !app.universityName && 'universityName', !app.programName && 'programName'].filter(Boolean).join(', ');
          console.warn(`Skipping invalid application at index ${index} - missing required fields: ${missing}`);
          return false;
        }
        return true;
      });
      if (validApps.length === 0 && newApps.length > 0) {
        throw new Error('No valid applications found in imported data');
      }
      reset(validApps.map(ensureApplicationDefaults));
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
      // Validate and normalize without mutating the caller's input array/objects.
      const validApps = newApps
        .filter((app, index) => {
          if (!app || typeof app !== 'object') return false;
          // For merge, we can be more lenient - just need university name
          if (!app.universityName) {
            console.warn('Skipping application without university name at index', index);
            return false;
          }
          return true;
        })
        .map(app => ensureApplicationDefaults({
          ...app,
          id: app.id || crypto.randomUUID(),
        }));
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
