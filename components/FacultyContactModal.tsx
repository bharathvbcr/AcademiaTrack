import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Application, FacultyContact, FacultyContactStatus } from '../types';
import { FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';

interface FacultyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: FacultyContact, universityName: string, isNewUniversity: boolean) => void;
  applications: Application[];
}

const baseInputClasses = "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition";

const FacultyContactModal: React.FC<FacultyContactModalProps> = ({ isOpen, onClose, onSave, applications }) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [contactStatus, setContactStatus] = useState<FacultyContactStatus>(FacultyContactStatus.NotContacted);
  const [contactDate, setContactDate] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const universityOptions = useMemo(() => {
    const uniqueUniversities = [...new Set(applications.map(app => app.universityName))];
    return uniqueUniversities.sort();
  }, [applications]);

  const filteredUniversities = useMemo(() => {
    if (!universityName) return universityOptions;
    return universityOptions.filter(uni => uni.toLowerCase().includes(universityName.toLowerCase()));
  }, [universityName, universityOptions]);

  const isNewUniversity = useMemo(() => {
    if (!universityName) return false;
    return !universityOptions.some(uni => uni.toLowerCase() === universityName.toLowerCase());
  }, [universityName, universityOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !universityName) {
      alert('Faculty Name and University are required.');
      return;
    }
    const newContact: FacultyContact = {
      id: Date.now(),
      name,
      website,
      email,
      researchArea,
      contactStatus,
      contactDate,
      interviewDate: null,
      interviewNotes: '',
      questions: '',
      answers: '',
    };
    onSave(newContact, universityName, isNewUniversity);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setWebsite('');
    setEmail('');
    setResearchArea('');
    setContactStatus(FacultyContactStatus.NotContacted);
    setContactDate(null);
    setUniversityName('');
    setShowSuggestions(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Add Faculty Contact</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="facultyName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Faculty Name</label>
              <input id="facultyName" type="text" placeholder="e.g. Dr. Alan Turing" value={name} onChange={(e) => setName(e.target.value)} className={baseInputClasses} required />
            </div>

            <div className="relative" ref={suggestionsRef}>
              <label htmlFor="universityName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">University</label>
              <input
                id="universityName"
                type="text"
                placeholder="Type to search or add new..."
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className={baseInputClasses}
                required
              />
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredUniversities.map(uni => (
                    <div
                      key={uni}
                      className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        setUniversityName(uni);
                        setShowSuggestions(false);
                      }}
                    >
                      {uni}
                    </div>
                  ))}
                  {isNewUniversity && universityName && (
                    <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                      Press Enter to add "{universityName}" as a new university.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input id="email" type="email" placeholder="e.g. alan.turing@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={baseInputClasses} />
            </div>
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Website</label>
              <input id="website" type="url" placeholder="https://example.com" value={website} onChange={(e) => setWebsite(e.target.value)} className={baseInputClasses} />
            </div>
            <div>
              <label htmlFor="researchArea" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Research Area</label>
              <input id="researchArea" type="text" placeholder="e.g. Computer Science, AI" value={researchArea} onChange={(e) => setResearchArea(e.target.value)} className={baseInputClasses} />
            </div>
            <div>
              <label htmlFor="contactStatus" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contact Status</label>
              <select id="contactStatus" value={contactStatus} onChange={(e) => setContactStatus(e.target.value as FacultyContactStatus)} className={baseInputClasses}>
                {FACULTY_CONTACT_STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contactDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contact Date</label>
              <input id="contactDate" type="date" value={contactDate || ''} onChange={(e) => setContactDate(e.target.value)} className={baseInputClasses + " [color-scheme:light_dark]"} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">Cancel</button>
            <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacultyContactModal;