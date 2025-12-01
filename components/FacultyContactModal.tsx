import React, { useState } from 'react';
import { Application, FacultyContact, FacultyContactStatus, UniversityResult } from '../types';
import { FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';
import { Input, Select, TextArea } from './ApplicationFormUI';
import UniversitySearchInput from './UniversitySearchInput';

interface FacultyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: FacultyContact, universityName: string, isNewUniversity: boolean) => void;
  applications: Application[];
}

const FacultyContactModal: React.FC<FacultyContactModalProps> = ({ isOpen, onClose, onSave, applications }) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [contactStatus, setContactStatus] = useState<FacultyContactStatus>(FacultyContactStatus.NotContacted);
  const [contactDate, setContactDate] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState('');
  const [errors, setErrors] = useState<{ name?: string; university?: string }>({});

  // Check if the current university name is new (not in the applications list)
  const isNewUniversity = !applications.some(app => app.universityName.toLowerCase() === universityName.toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; university?: string } = {};
    if (!name.trim()) newErrors.name = 'Faculty Name is required';
    if (!universityName.trim()) newErrors.university = 'University is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newContact: FacultyContact = {
      id: crypto.randomUUID(),
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
    setErrors({});
    onClose();
  };

  const handleUniversitySelect = (uni: UniversityResult) => {
    setUniversityName(uni.name);
    if (errors.university) setErrors(prev => ({ ...prev, university: undefined }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Add Faculty Contact</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Faculty Name"
              name="facultyName"
              placeholder="e.g. Dr. Alan Turing"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
              }}
              required
              error={errors.name}
            />

            <UniversitySearchInput
              value={universityName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setUniversityName(e.target.value);
                if (errors.university) setErrors(prev => ({ ...prev, university: undefined }));
              }}
              onSelect={handleUniversitySelect}
              required
              error={errors.university}
            />

            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="e.g. alan.turing@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Website"
              name="website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            <Input
              label="Research Area"
              name="researchArea"
              placeholder="e.g. Computer Science, AI"
              value={researchArea}
              onChange={(e) => setResearchArea(e.target.value)}
            />

            <Select
              label="Contact Status"
              name="contactStatus"
              value={contactStatus}
              onChange={(e) => setContactStatus(e.target.value as FacultyContactStatus)}
            >
              {FACULTY_CONTACT_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>

            <Input
              label="Contact Date"
              name="contactDate"
              type="date"
              value={contactDate || ''}
              onChange={(e) => setContactDate(e.target.value)}
              className="[color-scheme:light_dark]"
            />
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