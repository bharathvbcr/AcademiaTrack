import React, { useState, useEffect, useCallback } from 'react';
import { Application, ApplicationStatus, ApplicationFeeWaiverStatus, FacultyContact, TestStatus, FacultyContactStatus, ProgramType, DocumentStatus, Reminder, LocationDetails } from '../types';
import { STATUS_OPTIONS, FEE_WAIVER_STATUS_OPTIONS, TEST_STATUS_OPTIONS, FACULTY_CONTACT_STATUS_OPTIONS, DOCUMENT_LABELS, FACULTY_CONTACT_STATUS_COLORS, PROGRAM_TYPE_OPTIONS, ADMISSION_TERM_OPTIONS, POPULAR_UNIVERSITIES, DOCUMENT_STATUS_OPTIONS, DOCUMENT_STATUS_COLORS } from '../constants';
import DateInput from './DateInput';
import MarkdownEditor from './MarkdownEditor';
import { searchLocation, getLocationTimezone } from '../utils/locationService';
import { useDebounce } from '../hooks/useDebounce';

interface UniversityResult {
  name: string;
  web_pages: string[];
  country: string;
}

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

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, onSave, applicationToEdit, defaultProgramType }) => {
  const [appData, setAppData] = useState<Omit<Application, 'id'>>({ ...emptyApplication });
  const [isFacultyOpen, setIsFacultyOpen] = useState<boolean[]>([]);
  const [universitySuggestions, setUniversitySuggestions] = useState<UniversityResult[]>([]);
  const [allUniversities, setAllUniversities] = useState<UniversityResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [locationSuggestions, setLocationSuggestions] = useState<LocationDetails[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const debouncedLocation = useDebounce(appData.location, 500);

  useEffect(() => {
      const search = async () => {
        if (debouncedLocation.length < 3) {
            setLocationSuggestions([]);
            setShowLocationSuggestions(false);
            return;
        }
        // Only search if the user is actively typing/searching and it's not just setting the value from selection
        // However, distinguishing selection vs typing is hard with just debounced value.
        // We can rely on the fact that selecting hides the dropdown.
        // But if I select "Boston, MA", this effect runs again.
        // We can skip if the value exactly matches a selected one? No, the user might edit it.
        
        // Better approach: The `handleLocationChange` updates `appData.location`.
        // `debouncedLocation` updates later.
        // We trigger search here.
        
        try {
            // Optimization: Don't search if it matches the currently selected location to avoid re-opening
            if (appData.locationDetails && appData.location.startsWith(`${appData.locationDetails.city}`)) {
                 // This is tricky. Let's just search. The dropdown only shows on focus/typing.
                 // But we need to manage `showLocationSuggestions` carefully.
            }
            
            // Only search if the input is focused? We don't have that ref handy easily.
            // Let's just search and update suggestions. Visibility is controlled by onFocus/onBlur.
             const results = await searchLocation(debouncedLocation);
             setLocationSuggestions(results);
             // Don't auto-show here, let onFocus/onChange handle it? 
             // No, if I type, I want it to show.
             if (document.activeElement?.id === 'location') {
                 setShowLocationSuggestions(true);
             }
        } catch (error) {
            console.error('Error searching locations:', error);
        }
      };

      search();
  }, [debouncedLocation]);

  useEffect(() => {
    fetch('/universities.json')
      .then(res => res.json())
      .then(data => setAllUniversities(data))
      .catch(err => console.error('Failed to load universities:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (applicationToEdit) {
        const migratedFaculty = (applicationToEdit.facultyContacts || []).map(f => ({ ...f, contactStatus: f.contactStatus || FacultyContactStatus.NotContacted, contactDate: f.contactDate || null }));
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
              normalizedDocs[docKey] = { required: true, status: oldDocValue ? DocumentStatus.Submitted : DocumentStatus.NotStarted, submitted: oldDocValue ? (typeof oldDocValue === 'string' ? oldDocValue : today) : null };
            }
          }
        }
        const { gre, englishTest, admissionTerm, admissionYear, ...rest } = applicationToEdit;
        setAppData({ ...emptyApplication, ...rest, programType: applicationToEdit.programType || ProgramType.PhD, customProgramType: applicationToEdit.customProgramType || '', facultyContacts: migratedFaculty, documents: normalizedDocs, gre: { status: (gre as any)?.status ?? TestStatus.NotApplicable }, englishTest: { type: (englishTest as any)?.type ?? 'Not Required', status: (englishTest as any)?.status ?? TestStatus.NotApplicable }, admissionTerm: admissionTerm || null, admissionYear: admissionYear || null, reminders: applicationToEdit.reminders || [] });
        setIsFacultyOpen(migratedFaculty.map(f => !!f.name));
      } else {
        setAppData({ ...emptyApplication, programType: defaultProgramType });
        setIsFacultyOpen([]);
      }
    }
  }, [applicationToEdit, isOpen, defaultProgramType]);

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

  const handleTestChange = useCallback((test: 'gre' | 'englishTest', field: string, value: any) => {
    setAppData(prev => ({ ...prev, [test]: { ...prev[test], [field]: value } }));
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
      // Fetch timezone info
      const timezoneInfo = await getLocationTimezone(loc.latitude, loc.longitude);
      const fullLocationDetails = { ...loc, ...timezoneInfo };
      
      setAppData(prev => ({
          ...prev,
          location: `${loc.city}, ${loc.state ? loc.state + ', ' : ''}${loc.country}`,
          locationDetails: fullLocationDetails
      }));
      setShowLocationSuggestions(false);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setAppData(prev => ({ ...prev, location: value }));
      // Debounce effect will handle search
      if (value.length >= 3) {
          setShowLocationSuggestions(true);
      } else {
          setShowLocationSuggestions(false);
      }
  };

  const searchUniversities = useCallback((query: string) => {
    if (query.length < 3) {
      setUniversitySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const lowerQuery = query.toLowerCase();
      const results = allUniversities
        .filter(uni => uni.name.toLowerCase().includes(lowerQuery))
        .slice(0, 10);
      setUniversitySuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching universities:', error);
    } finally {
      setIsSearching(false);
    }
  }, [allUniversities]);

  const handleUniversitySelect = (uni: UniversityResult) => {
    setAppData(prev => ({
      ...prev,
      universityName: uni.name,
      portalLink: uni.web_pages[0] || prev.portalLink,
      location: uni.country !== 'United States' ? uni.country : prev.location // Simple default
    }));
    setShowSuggestions(false);
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
            <FieldSet legend="Program Details">
              <div className="relative">
                <Input
                  label="University Name"
                  name="universityName"
                  value={appData.universityName}
                  onChange={handleUniversityChange}
                  required
                  autoComplete="off"
                  onFocus={() => appData.universityName.length >= 3 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                />
                {showSuggestions && universitySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {universitySuggestions.map((uni, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleUniversitySelect(uni)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="font-medium">{uni.name}</div>
                        <div className="text-xs text-slate-500">{uni.country}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input label="Department / School" name="department" value={appData.department} onChange={handleChange} />
              <Input label="Program Name" name="programName" value={appData.programName} onChange={handleChange} required />
              <Select label="Program Type" name="programType" value={appData.programType} onChange={handleChange}>
                {PROGRAM_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type}</option>)}
              </Select>
              {appData.programType === ProgramType.Other && (
                <Input
                  label="Custom Program Type"
                  name="customProgramType"
                  value={appData.customProgramType || ''}
                  onChange={handleChange}
                  required
                />
              )}
              <DateInput label="Deadline" name="deadline" value={appData.deadline || ''} onChange={handleChange} />
              <DateInput label="Early/Preferred Deadline" name="preferredDeadline" value={appData.preferredDeadline || ''} onChange={handleChange} />
              <Select label="Admission Term" name="admissionTerm" value={appData.admissionTerm || ''} onChange={handleChange}>
                <option value="">Select Term</option>
                {ADMISSION_TERM_OPTIONS.map(term => <option key={term} value={term}>{term}</option>)}
              </Select>
              <Select label="Admission Year" name="admissionYear" value={appData.admissionYear || ''} onChange={handleChange}>
                <option value="">Select Year</option>
                {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => <option key={year} value={year}>{year}</option>)}
              </Select>
              <div className="relative md:col-span-2">
                  <Input 
                      label="Location (City, State)" 
                      name="location" 
                      value={appData.location} 
                      onChange={handleLocationChange} 
                      autoComplete="off"
                      onFocus={() => appData.location.length >= 3 && setShowLocationSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  />
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {locationSuggestions.map((loc, index) => (
                              <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleLocationSelect(loc)}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                  <div className="font-medium">{loc.city}</div>
                                  <div className="text-xs text-slate-500">
                                      {[loc.state, loc.country].filter(Boolean).join(', ')}
                                  </div>
                              </button>
                          ))}
                      </div>
                  )}
              </div>
            </FieldSet>
            <FieldSet legend="Rankings & Status">
              <Input label="University Ranking" name="universityRanking" value={appData.universityRanking} onChange={handleChange} />
              <Input label="Department Ranking" name="departmentRanking" value={appData.departmentRanking} onChange={handleChange} />
              <div className="flex items-center mt-2 md:col-span-2">
                <input id="isR1" name="isR1" type="checkbox" checked={appData.isR1} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-slate-400 text-red-600 focus:ring-red-500" />
                <label htmlFor="isR1" className="ml-2 block text-sm text-slate-800 dark:text-slate-200">R1 / Tier 1 University</label>
              </div>
            </FieldSet>
            <FieldSet legend="Submission Details">
              <Select label="Application Status" name="status" value={appData.status} onChange={handleChange}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Submission Portal Link" name="portalLink" type="url" value={appData.portalLink} onChange={handleChange} />
              <Input label="Application Fee ($)" name="applicationFee" type="number" value={appData.applicationFee} onChange={handleNumericChange} min="0" />
              <Select label="Fee Waiver Status" name="feeWaiverStatus" value={appData.feeWaiverStatus} onChange={handleChange}>
                {FEE_WAIVER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FieldSet>
            <FieldSet legend="Required Documents">
              <div className="md:col-span-2 space-y-3">
                {Object.keys(appData.documents).map(key => {
                  const docKey = key as keyof typeof appData.documents;
                  const doc = appData.documents[docKey];

                  return (
                    <div key={key} className="grid grid-cols-1 sm:grid-cols-[1.5fr,1fr,auto] gap-3 items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <input
                          id={`${key}-required`}
                          type="checkbox"
                          checked={doc.required}
                          onChange={e => handleDocumentChange(docKey, 'required', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-400 text-red-600 focus:ring-red-500"
                        />
                        <label htmlFor={`${key}-status`} className={`font-medium ${!doc.required ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {DOCUMENT_LABELS[docKey]}
                        </label>
                      </div>

                      <select
                        id={`${key}-status`}
                        value={doc.status}
                        onChange={e => handleDocumentChange(docKey, 'status', e.target.value)}
                        disabled={!doc.required}
                        className={`w-full px-2 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition ${DOCUMENT_STATUS_COLORS[doc.status]}`}
                        aria-label={`${DOCUMENT_LABELS[docKey]} status`}
                      >
                        {DOCUMENT_STATUS_OPTIONS.map(status => (
                          <option key={status} value={status} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {status}
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        value={doc.submitted || ''}
                        onChange={e => handleDocumentChange(docKey, 'submitted', e.target.value)}
                        disabled={!doc.required || doc.status !== DocumentStatus.Submitted}
                        className="w-full sm:w-36 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition text-sm [color-scheme:light_dark] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`${DOCUMENT_LABELS[docKey]} submission date`}
                        title={doc.status !== DocumentStatus.Submitted ? "Select 'Submitted' status to set date" : "Submission Date"}
                      />

                      <div className="flex items-center gap-1">
                        {doc.filePath ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenFile(doc.filePath!)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                              title={`Open ${doc.filePath}`}
                            >
                              <MaterialIcon name="visibility" className="text-lg" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(docKey)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                              title="Remove attachment"
                            >
                              <MaterialIcon name="close" className="text-lg" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAttachFile(docKey)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                            title="Attach file"
                          >
                            <MaterialIcon name="attach_file" className="text-lg" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </FieldSet>
            <FieldSet legend="Faculty Contacts">
              <div className="md:col-span-2 space-y-2">
                {appData.facultyContacts.map((faculty, index) => (
                  <div key={faculty.id} className="bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center p-2">
                      <button type="button" onClick={() => setIsFacultyOpen(p => p.map((s, i) => i === index ? !s : s))} className="flex-grow flex items-center gap-2 text-left" aria-expanded={isFacultyOpen[index]}>
                        <MaterialIcon name="expand_more" className={`transition-transform transform ${isFacultyOpen[index] ? 'rotate-180' : ''}`} />
                        <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{faculty.name || `Faculty Contact #${index + 1}`}</span>
                      </button>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border shrink-0 ${FACULTY_CONTACT_STATUS_COLORS[faculty.contactStatus]}`}>{faculty.contactStatus}</span>
                      <button type="button" onClick={() => removeFacultyContact(index)} className="ml-2 p-1.5 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" aria-label={`Remove contact`}>
                        <MaterialIcon name="delete" className="text-base" />
                      </button>
                    </div>
                    {isFacultyOpen[index] && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-600 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Name" name="name" value={faculty.name} onChange={e => handleFacultyChange(index, e)} />
                          <Input label="Email" name="email" type="email" value={faculty.email} onChange={e => handleFacultyChange(index, e)} />
                          <Input label="Website URL" name="website" type="url" value={faculty.website} onChange={e => handleFacultyChange(index, e)} className="md:col-span-2" />
                        </div>
                        <TextArea label="Research Area" name="researchArea" value={faculty.researchArea} onChange={e => handleFacultyChange(index, e)} rows={2} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-600 pt-4">
                          <Select label="Contact Status" name="contactStatus" value={faculty.contactStatus} onChange={e => handleFacultyChange(index, e)}>
                            {FACULTY_CONTACT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </Select>
                          <Input label="Contact Date" name="contactDate" type="date" value={faculty.contactDate || ''} onChange={e => handleFacultyChange(index, e)} disabled={faculty.contactStatus === FacultyContactStatus.NotContacted} />
                          {faculty.contactStatus === FacultyContactStatus.MeetingScheduled && (
                            <Input label="Interview Date" name="interviewDate" type="date" value={faculty.interviewDate || ''} onChange={e => handleFacultyChange(index, e)} className="md:col-span-2" />
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Interview Preparation</h4>
                          <div className="space-y-4">
                            <MarkdownEditor
                              label="Interview Notes"
                              value={faculty.interviewNotes || ''}
                              onChange={val => handleFacultyMarkdownChange(index, 'interviewNotes', val)}
                            />
                            <MarkdownEditor
                              label="Potential Questions"
                              value={faculty.questions || ''}
                              onChange={val => handleFacultyMarkdownChange(index, 'questions', val)}
                            />
                            <MarkdownEditor
                              label="Your Answers"
                              value={faculty.answers || ''}
                              onChange={val => handleFacultyMarkdownChange(index, 'answers', val)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {appData.facultyContacts.length < 3 && (
                  <button type="button" onClick={addFacultyContact} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                    <MaterialIcon name="add" /><span>Add Faculty Contact</span>
                  </button>
                )}
              </div>
            </FieldSet>
            <FieldSet legend="Reminders">
              <div className="md:col-span-2 space-y-3">
                {(appData.reminders || []).map(reminder => (
                  <div key={reminder.id} className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={reminder.completed}
                      onChange={() => toggleReminder(reminder.id)}
                      className="h-5 w-5 rounded border-slate-400 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-grow">
                      <div className={`text-sm font-medium ${reminder.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{reminder.text}</div>
                    </div>
                    <input
                      type="date"
                      value={reminder.date}
                      onChange={(e) => updateReminderDate(reminder.id, e.target.value)}
                      className="text-sm bg-transparent border-none focus:ring-0 text-slate-500 dark:text-slate-400"
                    />
                    <button type="button" onClick={() => deleteReminder(reminder.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <MaterialIcon name="delete" className="text-lg" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addReminder} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                  <MaterialIcon name="add_alert" className="text-lg" />
                  Add Reminder
                </button>
              </div>
            </FieldSet>
            <FieldSet legend="General Notes">
              <MarkdownEditor
                label="Additional notes about this application..."
                value={appData.notes}
                onChange={val => setAppData(prev => ({ ...prev, notes: val }))}
                className="md:col-span-2"
              />
            </FieldSet>
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

// Helper components for consistent form styling
const FieldSet: React.FC<{ legend: string; children: React.ReactNode; }> = ({ legend, children }) => (
  <fieldset>
    <legend className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{legend}</legend>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </fieldset>
);

const baseInputClasses = "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition disabled:bg-slate-100 dark:disabled:bg-slate-800";

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className, ...props }) => (
  <div className={className}>
    <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    <input {...props} id={props.name} className={baseInputClasses} />
  </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, className, ...props }) => (
  <div className={className}>
    <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    <select {...props} id={props.name} className={baseInputClasses}>{children}</select>
  </div>
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className, ...props }) => (
  <div className={className}>
    <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    <textarea {...props} id={props.name} className={baseInputClasses} />
  </div>
);

export default ApplicationModal;