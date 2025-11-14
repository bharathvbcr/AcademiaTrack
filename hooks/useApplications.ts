import { useState } from 'react';
import { Application, FacultyContact, ApplicationStatus, ApplicationFeeWaiverStatus, TestStatus, ProgramType } from '../types';
import { useLocalStorage } from './useLocalStorage';

export const useApplications = () => {
  const [applications, setApplications] = useLocalStorage<Application[]>('phd-applications', []);

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
        deadline: null,
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
        // This case should ideally not be hit if a new university is handled above,
        // but as a fallback, alert the user.
        alert(`Could not find an application for "${universityName}". Please add an application for this university first.`);
      }
    }
  };

  return {
    applications,
    addApplication,
    updateApplication,
    deleteApplication,
    addFacultyContact,
  };
};
