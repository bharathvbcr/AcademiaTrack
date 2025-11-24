import React, { useState, useEffect, useCallback } from 'react';
import { Application, ApplicationStatus, ApplicationFeeWaiverStatus, FacultyContact, TestStatus, FacultyContactStatus, ProgramType, DocumentStatus, Reminder, LocationDetails, UniversityResult } from '../types';
import { searchLocation, getLocationTimezone } from '../utils/locationService';
import { useDebounce } from '../hooks/useDebounce';
import { useUniversityData } from '../hooks/useUniversityData';
import { MaterialIcon } from './ApplicationFormUI';
import ProgramDetailsSection from './ProgramDetailsSection';
import RankingsStatusSection from './RankingsStatusSection';
import SubmissionDetailsSection from './SubmissionDetailsSection';
import DocumentsSection from './DocumentsSection';
import FacultyContactsSection from './FacultyContactsSection';
import RemindersSection from './RemindersSection';
import GeneralNotesSection from './GeneralNotesSection';


interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (application: Application) => void;
  applicationToEdit: Application | null;
  defaultProgramType: ProgramType;
}

const emptyApplication: Omit<Application, 'id'> = {
  universityName: '',
  programName: '',
  programType: ProgramType.PhD,
  customProgramType: '',
  department: '',
  location: '',
  isR1: false,
  universityRanking: '',
  departmentRanking: '',
  status: ApplicationStatus.NotStarted,
  deadline: '',
  preferredDeadline: '',
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
  preferredFaculty: '',
  notes: '',
  reminders: [],
};

const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, onSave, applicationToEdit, defaultProgramType }) => {
  const [appData, setAppData] = useState<Omit<Application, 'id'>>({ ...emptyApplication });
  const [isFacultyOpen, setIsFacultyOpen] = useState<boolean[]>([]);

  const {
    universitySuggestions,
    showSuggestions,
    setShowSuggestions,
    searchUniversities
  } = useUniversityData();

  const [locationSuggestions, setLocationSuggestions] = useState<LocationDetails[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const debouncedLocation = useDebounce(appData.location, 500);

  // Effect to initialize form data
  useEffect(() => {
    if (isOpen) {
      if (applicationToEdit) {
        const migratedFaculty = (applicationToEdit.facultyContacts || []).map(f => ({
          ...f,
          contactStatus: f.contactStatus || FacultyContactStatus.NotContacted,
          contactDate: f.contactDate || null
        }));

        const normalizedDocs: Application['documents'] = { ...emptyApplication.documents };
        if (applicationToEdit.documents) {
          const today = new Date().toISOString().split('T')[0];
          for (const key in normalizedDocs) {
            const docKey = key as keyof typeof normalizedDocs;
            const oldDocValue = (applicationToEdit.documents as any)[docKey];

            if (typeof oldDocValue === 'object' && oldDocValue !== null) {
              const hasStatus = 'status' in oldDocValue;
              const submittedDate = oldDocValue.submitted || null;

              normalizedDocs[docKey] = {
                required: oldDocValue.required ?? true,
                status: hasStatus ? oldDocValue.status : (submittedDate ? DocumentStatus.Submitted : DocumentStatus.NotStarted),
                submitted: submittedDate,
                filePath: oldDocValue.filePath
              };
            } else {
              normalizedDocs[docKey] = {
                required: true,
                status: oldDocValue ? DocumentStatus.Submitted : DocumentStatus.NotStarted,
                submitted: oldDocValue ? (typeof oldDocValue === 'string' ? oldDocValue : today) : null
              };
            }
          }
        }

        const { gre, englishTest, admissionTerm, admissionYear, ...rest } = applicationToEdit;

        setAppData({
          ...emptyApplication,
          ...rest,
          programType: applicationToEdit.programType || ProgramType.PhD,
          customProgramType: applicationToEdit.customProgramType || '',
          facultyContacts: migratedFaculty,
          documents: normalizedDocs,
          gre: {
            status: (gre as any)?.status ?? TestStatus.NotApplicable,
            cost: (gre as any)?.cost
          },
          englishTest: {
            type: (englishTest as any)?.type ?? 'Not Required',
            status: (englishTest as any)?.status ?? TestStatus.NotApplicable,
            cost: (englishTest as any)?.cost
          },
          admissionTerm: admissionTerm || null,
          admissionYear: admissionYear || null,
          reminders: applicationToEdit.reminders || []
        });
        setIsFacultyOpen(migratedFaculty.map(f => !!f.name));
      } else {
        setAppData({ ...emptyApplication, programType: defaultProgramType });
        setIsFacultyOpen([]);
      }
    }
  }, [applicationToEdit, isOpen, defaultProgramType]);

  // Effect for location search
  useEffect(() => {
    const search = async () => {
      if (debouncedLocation.length < 3) {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
        return;
      }

      if (appData.locationDetails) {
        return;
      }

      try {
        const results = await searchLocation(debouncedLocation);
        setLocationSuggestions(results);

        if (document.activeElement?.id === 'location') {
          setShowLocationSuggestions(true);
        }
      } catch (error) {
        console.error('Error searching locations:', error);
      }
    };
    search();
  }, [debouncedLocation, appData.locationDetails]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAppData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleNumericChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAppData(prev => ({ ...prev, [name]: value === '' ? '' : Math.max(0, parseInt(value, 10)) }));
  }, []);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setAppData(prev => ({ ...prev, [name]: checked }));
  }, []);

  const handleDocumentChange = useCallback((docKey: keyof Application['documents'], field: 'required' | 'status' | 'submitted', value: any) => {
    setAppData(prev => {
      const newDocuments = { ...prev.documents };
      const doc = { ...newDocuments[docKey] };

      if (field === 'required') {
        doc.required = value;
        if (!value) {
          doc.status = DocumentStatus.NotStarted;
          doc.submitted = null;
        }
      } else if (field === 'status') {
        doc.status = value;
        if (value === DocumentStatus.Submitted && !doc.submitted) {
          doc.submitted = new Date().toISOString().split('T')[0];
        } else if (value !== DocumentStatus.Submitted) {
          doc.submitted = null;
        }
      } else if (field === 'submitted') {
        doc.submitted = value;
        if (value && doc.status !== DocumentStatus.Submitted) {
          doc.status = DocumentStatus.Submitted;
        }
      }

      newDocuments[docKey] = doc;
      return { ...prev, documents: newDocuments };
    });
  }, []);

  const handleAttachFile = useCallback(async (docKey: keyof Application['documents']) => {
    try {
      const filePath = await window.electron.selectFile();
      if (filePath) {
        setAppData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [docKey]: { ...prev.documents[docKey], filePath }
          }
        }));
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  }, []);

  const handleOpenFile = useCallback(async (filePath: string) => {
    try {
      await window.electron.openFile(filePath);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  }, []);

  const handleRemoveFile = useCallback((docKey: keyof Application['documents']) => {
    setAppData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docKey]: { ...prev.documents[docKey], filePath: undefined }
      }
    }));
  }, []);

  const handleFacultyChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedFaculty = [...appData.facultyContacts];
    const facultyToUpdate = { ...updatedFaculty[index] };
    if (name === 'contactStatus') {
      const newStatus = value as FacultyContactStatus;
      facultyToUpdate.contactStatus = newStatus;
      if (newStatus === FacultyContactStatus.NotContacted) facultyToUpdate.contactDate = null;
      else if (!facultyToUpdate.contactDate) facultyToUpdate.contactDate = new Date().toISOString().split('T')[0];
    } else (facultyToUpdate as any)[name] = value;
    updatedFaculty[index] = facultyToUpdate;
    setAppData(prev => ({ ...prev, facultyContacts: updatedFaculty }));
  }, [appData.facultyContacts]);

  const handleFacultyMarkdownChange = useCallback((index: number, field: string, value: string) => {
    const updatedFaculty = [...appData.facultyContacts];
    const facultyToUpdate = { ...updatedFaculty[index], [field]: value };
    updatedFaculty[index] = facultyToUpdate;
    setAppData(prev => ({ ...prev, facultyContacts: updatedFaculty }));
  }, [appData.facultyContacts]);

  const addFacultyContact = useCallback(() => {
    if (appData.facultyContacts.length >= 3) return;
    setAppData(prev => ({ ...prev, facultyContacts: [...prev.facultyContacts, { id: Date.now(), name: '', website: '', email: '', researchArea: '', contactStatus: FacultyContactStatus.NotContacted, contactDate: null, interviewDate: null, interviewNotes: '', questions: '', answers: '' }] }));
    setIsFacultyOpen(prev => [...prev, true]);
  }, [appData.facultyContacts]);

  const removeFacultyContact = useCallback((indexToRemove: number) => {
    setAppData(prev => ({ ...prev, facultyContacts: prev.facultyContacts.filter((_, index) => index !== indexToRemove) }));
    setIsFacultyOpen(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleLocationSelect = async (loc: LocationDetails) => {
    const timezoneInfo = await getLocationTimezone(loc.latitude, loc.longitude);
    const fullLocationDetails = { ...loc, ...timezoneInfo };

    setAppData(prev => ({
      ...prev,
      location: [loc.city, loc.state, loc.country].filter((part, index, self) => part && self.indexOf(part) === index).join(', '),
      locationDetails: fullLocationDetails
    }));
    setShowLocationSuggestions(false);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAppData(prev => ({
      ...prev,
      location: value,
      locationDetails: undefined
    }));
    if (value.length >= 3) {
      setShowLocationSuggestions(true);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const handleUniversitySelect = async (uni: UniversityResult) => {
    setAppData(prev => ({
      ...prev,
      universityName: uni.name,
      location: [uni['state-province'], uni.country].filter(Boolean).join(', ')
    }));
    setShowSuggestions(false);

    try {
      const parts = [uni.name, uni['state-province'], uni.country].filter(Boolean);
      let query = parts.join(', ');
      let locations = await searchLocation(query);

      if (!locations || locations.length === 0) {
        if (uni['state-province']) {
          query = `${uni.name}, ${uni.country}`;
          locations = await searchLocation(query);
        }
      }

      if (!locations || locations.length === 0) {
        locations = await searchLocation(uni.name);
      }

      if (locations && locations.length > 0) {
        const bestMatch = locations[0];
        handleLocationSelect(bestMatch);
      }
    } catch (error) {
      console.error("Failed to auto-populate location:", error);
    }
  };

  const handleUniversityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAppData(prev => ({ ...prev, universityName: value }));
    searchUniversities(value);
  };

  const addReminder = useCallback(() => {
    const text = prompt('Enter reminder text:');
    if (text) {
      setAppData(prev => ({
        ...prev,
        reminders: [...(prev.reminders || []), { id: Date.now().toString(), text, date: new Date().toISOString().split('T')[0], completed: false }]
      }));
    }
  }, []);

  const toggleReminder = useCallback((id: string) => {
    setAppData(prev => ({
      ...prev,
      reminders: (prev.reminders || []).map(r => r.id === id ? { ...r, completed: !r.completed } : r)
    }));
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setAppData(prev => ({
      ...prev,
      reminders: (prev.reminders || []).filter(r => r.id !== id)
    }));
  }, []);

  const updateReminderDate = useCallback((id: string, date: string) => {
    setAppData(prev => ({
      ...prev,
      reminders: (prev.reminders || []).map(r => r.id === id ? { ...r, date } : r)
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAppData = { ...appData };
    if (finalAppData.programType !== ProgramType.Other) {
      finalAppData.customProgramType = '';
    }
    onSave({ ...finalAppData, id: applicationToEdit?.id || '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" aria-hidden="true"></div>

      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-3xl transform transition-all">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white" id="modal-title">{applicationToEdit ? 'Edit Application' : 'Add New Application'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">
            <ProgramDetailsSection
              appData={appData}
              handleChange={handleChange}
              handleUniversityChange={handleUniversityChange}
              handleUniversitySelect={handleUniversitySelect}
              universitySuggestions={universitySuggestions}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              handleLocationChange={handleLocationChange}
              handleLocationSelect={handleLocationSelect}
              locationSuggestions={locationSuggestions}
              showLocationSuggestions={showLocationSuggestions}
              setShowLocationSuggestions={setShowLocationSuggestions}
            />
            <RankingsStatusSection
              appData={appData}
              handleChange={handleChange}
              handleCheckboxChange={handleCheckboxChange}
            />
            <SubmissionDetailsSection
              appData={appData}
              handleChange={handleChange}
              handleNumericChange={handleNumericChange}
            />
            <DocumentsSection
              appData={appData}
              handleDocumentChange={handleDocumentChange}
              handleOpenFile={handleOpenFile}
              handleRemoveFile={handleRemoveFile}
              handleAttachFile={handleAttachFile}
            />
            <FacultyContactsSection
              appData={appData}
              isFacultyOpen={isFacultyOpen}
              setIsFacultyOpen={setIsFacultyOpen}
              handleFacultyChange={handleFacultyChange}
              removeFacultyContact={removeFacultyContact}
              handleFacultyMarkdownChange={handleFacultyMarkdownChange}
              addFacultyContact={addFacultyContact}
            />
            <RemindersSection
              appData={appData}
              toggleReminder={toggleReminder}
              updateReminderDate={updateReminderDate}
              deleteReminder={deleteReminder}
              addReminder={addReminder}
            />
            <GeneralNotesSection
              appData={appData}
              setAppData={setAppData}
            />
          </div>
          <div className="flex items-center justify-end p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-3xl space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">Cancel</button>
            <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationModal;