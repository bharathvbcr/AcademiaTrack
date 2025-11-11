import React, { useState, useEffect, useCallback } from 'react';
import { Application, FacultyContact, FacultyContactStatus } from '../types';
import { FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';

interface FacultyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (universityName: string, facultyContact: Omit<FacultyContact, 'id'>) => void;
  applications: Application[];
}

const emptyFacultyContact: Omit<FacultyContact, 'id'> = {
  name: '',
  website: '',
  email: '',
  researchArea: '',
  contactStatus: FacultyContactStatus.NotContacted,
  contactDate: null,
};

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const FacultyContactModal: React.FC<FacultyContactModalProps> = ({ isOpen, onClose, onSave, applications }) => {
  const [universityName, setUniversityName] = useState('');
  const [facultyContact, setFacultyContact] = useState<Omit<FacultyContact, 'id'>>(emptyFacultyContact);

  useEffect(() => {
    if (isOpen) {
      setUniversityName('');
      setFacultyContact(emptyFacultyContact);
    }
  }, [isOpen]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFacultyContact(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityName) {
      // Handle case where no university is selected
      return;
    }
    onSave(universityName, facultyContact);
  };

  if (!isOpen) return null;

  const universityOptions = [...new Set(applications.map(app => app.universityName))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" aria-hidden="true"></div>
      
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-lg transform transition-all">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white" id="modal-title">Add Faculty Contact</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <MaterialIcon name="close" className="text-xl"/>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
            <Select label="University" name="universityName" value={universityName} onChange={(e) => setUniversityName(e.target.value)} required>
              <option value="">Select University</option>
              {universityOptions.map(name => <option key={name} value={name}>{name}</option>)}
            </Select>
            <Input label="Name" name="name" value={facultyContact.name} onChange={handleChange} required />
            <Input label="Email" name="email" type="email" value={facultyContact.email} onChange={handleChange} />
            <Input label="Website URL" name="website" type="url" value={facultyContact.website} onChange={handleChange} />
            <TextArea label="Research Area" name="researchArea" value={facultyContact.researchArea} onChange={handleChange} rows={2} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Contact Status" name="contactStatus" value={facultyContact.contactStatus} onChange={handleChange}>
                {FACULTY_CONTACT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Contact Date" name="contactDate" type="date" value={facultyContact.contactDate || ''} onChange={handleChange} disabled={facultyContact.contactStatus === FacultyContactStatus.NotContacted} />
            </div>
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

export default FacultyContactModal;
