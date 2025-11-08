import React, { useState, useEffect, useCallback } from 'react';
import { Application, ApplicationStatus, ApplicationFeeWaiverStatus, FacultyContact, TestStatus, FacultyContactStatus, ProgramType } from '../types';
import { STATUS_OPTIONS, FEE_WAIVER_STATUS_OPTIONS, TEST_STATUS_OPTIONS, FACULTY_CONTACT_STATUS_OPTIONS, DOCUMENT_LABELS, FACULTY_CONTACT_STATUS_COLORS, PROGRAM_TYPE_OPTIONS, ADMISSION_TERM_OPTIONS } from '../constants';
import DateInput from './DateInput';

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
  facultyContacts: [],
  preferredFaculty: '',
  notes: '',
};

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, onSave, applicationToEdit, defaultProgramType }) => {
  const [appData, setAppData] = useState<Omit<Application, 'id'>>({ ...emptyApplication });
  const [isFacultyOpen, setIsFacultyOpen] = useState<boolean[]>([]);

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
                if (typeof oldDocValue === 'object' && oldDocValue !== null && 'required' in oldDocValue) {
                    normalizedDocs[docKey] = oldDocValue as { required: boolean; submitted: string | null };
                } else {
                    normalizedDocs[docKey] = { required: true, submitted: oldDocValue ? (typeof oldDocValue === 'string' ? oldDocValue : today) : null };
                }
            }
        }
        const { gre, englishTest, admissionTerm, admissionYear, ...rest } = applicationToEdit;
        setAppData({ ...emptyApplication, ...rest, programType: applicationToEdit.programType || ProgramType.PhD, customProgramType: applicationToEdit.customProgramType || '', facultyContacts: migratedFaculty, documents: normalizedDocs, gre: { status: (gre as any)?.status ?? TestStatus.NotApplicable }, englishTest: { type: (englishTest as any)?.type ?? 'Not Required', status: (englishTest as any)?.status ?? TestStatus.NotApplicable }, admissionTerm: admissionTerm || null, admissionYear: admissionYear || null });
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

  const handleDocumentChange = useCallback((docKey: keyof Application['documents'], value: boolean) => {
    setAppData(prev => {
      const newDocuments = { ...prev.documents };
      const doc = { ...newDocuments[docKey] };

      doc.required = value;
      // If a document is no longer required, clear its submission status.
      if (!value) {
        doc.submitted = null;
      }
      
      newDocuments[docKey] = doc;
      return { ...prev, documents: newDocuments };
    });
  }, []);

  const handleDocumentDateChange = useCallback((docKey: keyof Application['documents'], value: string) => {
    setAppData(prev => ({ ...prev, documents: { ...prev.documents, [docKey]: { ...prev.documents[docKey], submitted: value || null }}}));
  }, []);
  
  const handleTestChange = useCallback((test: 'gre' | 'englishTest', field: string, value: any) => {
    setAppData(prev => ({ ...prev, [test]: { ...prev[test], [field]: value }}));
  }, []);

  const handleFacultyChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedFaculty = [...appData.facultyContacts];
    const facultyToUpdate = { ...updatedFaculty[index] };
    if (name === 'contactStatus') {
        const newStatus = value as FacultyContactStatus;
        facultyToUpdate.contactStatus = newStatus;
        if (newStatus === FacultyContactStatus.NotContacted) facultyToUpdate.contactDate = null;
        // Fix: Removed redundant condition `newStatus !== FacultyContactStatus.NotContacted` which is always true in an else block.
        else if (!facultyToUpdate.contactDate) facultyToUpdate.contactDate = new Date().toISOString().split('T')[0];
    } else (facultyToUpdate as any)[name] = value;
    updatedFaculty[index] = facultyToUpdate;
    setAppData(prev => ({ ...prev, facultyContacts: updatedFaculty }));
  }, [appData.facultyContacts]);
  
  const addFacultyContact = useCallback(() => {
    if (appData.facultyContacts.length >= 3) return;
    setAppData(prev => ({ ...prev, facultyContacts: [...prev.facultyContacts, { id: Date.now(), name: '', website: '', email: '', researchArea: '', contactStatus: FacultyContactStatus.NotContacted, contactDate: null }]}));
    setIsFacultyOpen(prev => [...prev, true]);
  }, [appData.facultyContacts]);

  const removeFacultyContact = useCallback((indexToRemove: number) => {
    setAppData(prev => ({ ...prev, facultyContacts: prev.facultyContacts.filter((_, index) => index !== indexToRemove) }));
    setIsFacultyOpen(prev => prev.filter((_, index) => index !== indexToRemove));
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
            <MaterialIcon name="close" className="text-xl"/>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">
            <FieldSet legend="Program Details">
                <Input label="University Name" name="universityName" value={appData.universityName} onChange={handleChange} required />
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
                <Input label="Location (City, State)" name="location" value={appData.location} onChange={handleChange} className="md:col-span-2" />
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
                <div className="md:col-span-2 space-y-2">
                {Object.keys(appData.documents).map(key => {
                    const docKey = key as keyof typeof appData.documents;
                    return (
                    <div key={key} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <input id={`${key}-required`} type="checkbox" checked={appData.documents[docKey].required} onChange={e => handleDocumentChange(docKey, e.target.checked)} className="h-4 w-4 rounded border-slate-400 text-red-600 focus:ring-red-500" />
                            <label htmlFor={`${key}-submitted-date`} className={`font-medium ${!appData.documents[docKey].required ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{DOCUMENT_LABELS[docKey]}</label>
                        </div>
                        <input 
                          id={`${key}-submitted-date`}
                          type="date" 
                          value={appData.documents[docKey].submitted || ''} 
                          onChange={e => handleDocumentDateChange(docKey, e.target.value)}
                          disabled={!appData.documents[docKey].required}
                          className="w-36 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition text-sm [color-scheme:light_dark] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                          aria-label={`${DOCUMENT_LABELS[docKey]} submission date`} 
                        />
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
                                <Input label="Website URL" name="website" type="url" value={faculty.website} onChange={e => handleFacultyChange(index, e)} className="md:col-span-2"/>
                            </div>
                             <TextArea label="Research Area" name="researchArea" value={faculty.researchArea} onChange={e => handleFacultyChange(index, e)} rows={2} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-600 pt-4">
                                <Select label="Contact Status" name="contactStatus" value={faculty.contactStatus} onChange={e => handleFacultyChange(index, e)}>
                                    {FACULTY_CONTACT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </Select>
                                <Input label="Contact Date" name="contactDate" type="date" value={faculty.contactDate || ''} onChange={e => handleFacultyChange(index, e)} disabled={faculty.contactStatus === FacultyContactStatus.NotContacted} />
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
             <FieldSet legend="General Notes">
                <TextArea name="notes" label="Additional notes about this application..." value={appData.notes} onChange={handleChange} rows={4} className="md:col-span-2" />
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