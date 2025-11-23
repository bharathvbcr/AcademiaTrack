import { useState, useEffect } from 'react';
import { Application, FacultyContact, ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, ProgramType } from '../types';

export const useApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);

  // Load data on mount
  useEffect(() => {
    const loadApplications = async () => {
      if (window.electron) {
        const data = await window.electron.loadData();
        if (data) {
          setApplications(data);
          checkDeadlines(data);
        }
      } else {
        // Fallback for web-only dev (optional, or just warn)
        const saved = localStorage.getItem('phd-applications');
        if (saved) {
          setApplications(JSON.parse(saved));
        }
      }
    };
    loadApplications();
  }, []);

  // Save data whenever applications change
  useEffect(() => {
    if (window.electron) {
      window.electron.saveData(applications);
    } else {
      localStorage.setItem('phd-applications', JSON.stringify(applications));
    }
  }, [applications]);

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
    const newApplication = { ...app, id: new Date().toISOString() };
    setApplications(apps => [...apps, newApplication]);
  };

  const updateApplication = (updatedApp: Application) => {
    setApplications(apps => apps.map(app => app.id === updatedApp.id ? updatedApp : app));
  };

  const deleteApplication = (id: string) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      setApplications(apps => apps.filter(app => app.id !== id));
    }
  };

  const addFacultyContact = (contact: FacultyContact, universityName: string, isNewUniversity: boolean, defaultProgramType: ProgramType) => {
    if (isNewUniversity) {
      const newApplication: Application = {
        id: new Date().toISOString(),
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
        deadline: '',
        preferredDeadline: '',
        admissionTerm: null,
        admissionYear: null,
        applicationFee: 0,
        feeWaiverStatus: ApplicationFeeWaiverStatus.NotRequested,
        portalLink: '',
        documents: {
          cv: { required: true, submitted: null },
          statementOfPurpose: { required: true, submitted: null },
          transcripts: { required: true, submitted: null },
          lor1: { required: false, submitted: null },
          lor2: { required: false, submitted: null },
          lor3: { required: false, submitted: null },
          writingSample: { required: false, submitted: null },
        },
        gre: { status: TestStatus.NotApplicable },
        englishTest: { type: 'Not Required', status: TestStatus.NotApplicable },
        preferredFaculty: '',
        notes: '',
        customProgramType: '',
      };
      setApplications(apps => [...apps, newApplication]);
    } else {
      const appToUpdate = applications.find(app => app.universityName === universityName);
      if (appToUpdate) {
        const updatedApp = {
          ...appToUpdate,
          facultyContacts: [...appToUpdate.facultyContacts, contact],
        };
        setApplications(apps => apps.map(app => app.id === updatedApp.id ? updatedApp : app));
      } else {
        alert(`Could not find an application for "${universityName}". Please add an application for this university first.`);
      }
    }
  };

  const importApplications = (newApps: Application[]) => {
    setApplications(newApps);
  };

  return {
    applications,
    addApplication,
    updateApplication,
    deleteApplication,
    addFacultyContact,
    importApplications,
  };
};
