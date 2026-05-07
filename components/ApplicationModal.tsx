import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import {
  Application, FacultyContactStatus, ProgramType,
  LocationDetails, UniversityResult
} from '../types';
import { useUniversityData } from '../hooks/useUniversityData';
import { useDebounce } from '../hooks/useDebounce';
import { useApplicationForm } from '../hooks/useApplicationForm';
import { useTemplates } from '../hooks/useTemplates';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { MaterialIcon } from './ApplicationFormUI';
import Tooltip from './Tooltip';
import ProgramDetailsSection from './ProgramDetailsSection';
import RankingsStatusSection from './RankingsStatusSection';
import SubmissionDetailsSection from './SubmissionDetailsSection';
import RemindersSection from './RemindersSection';
import GeneralNotesSection from './GeneralNotesSection';
import RecommenderSection from './RecommenderSection';
import FacultyContactsSection from './FacultyContactsSection';
import FinancialsSection from './FinancialsSection';
import EssaysSection from './EssaysSection';
import DocumentsSection from './DocumentsSection';
import { getLocationTimezone, searchLocation } from '../utils/locationService';
import CustomFieldsSection from './CustomFieldsSection';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationToEdit?: Application;
  onSave: (app: Application) => void;
  applications: Application[];
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, applicationToEdit, onSave, applications }) => {
  const {
    universitySuggestions,
    showSuggestions,
    setShowSuggestions,
    searchUniversities
  } = useUniversityData();

  useLockBodyScroll(isOpen);
  const modalRef = React.useRef<HTMLDivElement>(null);
  useFocusManagement(isOpen, modalRef as React.RefObject<HTMLElement>);

  const {
    appData,
    setAppData,
    isFacultyOpen,
    setIsFacultyOpen,
    isRecommenderOpen,
    setIsRecommenderOpen,
    isScholarshipOpen,
    setIsScholarshipOpen,
    handleChange,
    handleNumericChange,
    handleCheckboxChange,
    handleDocumentChange,
    handleAttachFile,
    handleOpenFile,
    handleRemoveFile,
    handleFacultyChange,
    handleFacultyMarkdownChange,
    addFacultyContact,
    removeFacultyContact,
    handleFacultyFitChange,
    addPaperRead,
    removePaperRead,
    addCorrespondence,
    removeCorrespondence,
    addEssay,
    removeEssay,
    updateEssayStatus,
    addEssayDraft,
    removeEssayDraft,
    updateEssayDraft,
    handleAttachEssayDraftFile,
    handleOpenEssayDraftFile,
    handleRemoveEssayDraftFile,
    handleRecommenderChange,
    addRecommender,
    removeRecommender,
    addReminder,
    toggleReminder,
    deleteReminder,
    updateReminderDate,
    handleFinancialOfferChange,
    handleFinancialNumericChange,
    handleFinancialCheckboxChange,
    addScholarship,
    removeScholarship,
    handleScholarshipChange,
    handleCustomFieldChange
  } = useApplicationForm(isOpen, applicationToEdit);

  const [locationSuggestions, setLocationSuggestions] = useState<LocationDetails[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const { templates, useTemplate } = useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const debouncedLocation = useDebounce(appData.location, 500);

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
    }
  }, [isOpen, applicationToEdit]);

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

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const defaults = useTemplate(templateId);
    if (!defaults) return;

    setAppData(prev => ({
      ...prev,
      ...defaults,
      id: prev.id,
      universityName: prev.universityName,
      programName: prev.programName,
      department: defaults.department ?? prev.department,
      location: prev.location,
      locationDetails: prev.locationDetails,
      facultyContacts: prev.facultyContacts,
      recommenders: prev.recommenders,
      reminders: prev.reminders,
      notes: prev.notes,
      customFields: prev.customFields,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAppData = { ...appData };
    if (finalAppData.programType !== ProgramType.Other) {
      finalAppData.customProgramType = '';
    }
    onSave({ ...finalAppData, id: applicationToEdit?.id || '' });
    onClose();
  };

  // Context-aware keyboard shortcuts for modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const finalAppData = { ...appData };
        if (finalAppData.programType !== ProgramType.Other) {
          finalAppData.customProgramType = '';
        }
        onSave({ ...finalAppData, id: applicationToEdit?.id || '' });
        onClose();
      }
      // Cmd/Ctrl + Shift + D to duplicate (if editing)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        // Duplicate functionality would need to be passed as prop
        // For now, just close and let parent handle
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, appData, applicationToEdit, onSave, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
          aria-describedby="modal-description"
        >
          <motion.div
            onClick={onClose}
            className="fixed inset-0 liquid-glass-modal"
            aria-hidden="true"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          <motion.div
            className="relative liquid-glass-modal-content rounded-3xl w-full max-w-3xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
              <div>
                <h3 className="text-xl font-semibold text-[#f4f4f5]" id="modal-title">{applicationToEdit ? 'Edit Application' : 'Add New Application'}</h3>
                <p id="modal-description" className="sr-only">
                  {applicationToEdit ? 'Edit application details and save changes' : 'Fill in the form to add a new application'}
                </p>
              </div>
              <Tooltip content="Close (Esc)">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5] transition-colors"
                  aria-label="Close modal"
                >
                  <MaterialIcon name="close" className="text-xl" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8" onKeyDown={(e) => {
                // Prevent form submission on Enter in text areas
                if (e.key === 'Enter' && (e.target instanceof HTMLTextAreaElement)) {
                  return;
                }
              }}>
                {!applicationToEdit && templates.length > 0 && (
                  <div className="liquid-glass rounded-xl border border-[#27272a] p-4">
                    <label htmlFor="application-template" className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
                      Application Template
                    </label>
                    <select
                      id="application-template"
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full px-3 py-2 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626] text-[#f4f4f5]"
                    >
                      <option value="">Start without template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                  applications={applications}
                />
                <CustomFieldsSection
                  appData={appData}
                  handleCustomFieldChange={handleCustomFieldChange}
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
                <EssaysSection
                  appData={appData}
                  addEssay={addEssay}
                  removeEssay={removeEssay}
                  updateEssayStatus={updateEssayStatus}
                  addEssayDraft={addEssayDraft}
                  removeEssayDraft={removeEssayDraft}
                  updateEssayDraft={updateEssayDraft}
                  handleAttachEssayDraftFile={handleAttachEssayDraftFile}
                  handleOpenEssayDraftFile={handleOpenEssayDraftFile}
                  handleRemoveEssayDraftFile={handleRemoveEssayDraftFile}
                />
                <FacultyContactsSection
                  appData={appData}
                  handleFacultyChange={handleFacultyChange}
                  handleFacultyMarkdownChange={handleFacultyMarkdownChange}
                  addFacultyContact={addFacultyContact}
                  removeFacultyContact={removeFacultyContact}
                  isFacultyOpen={isFacultyOpen}
                  setIsFacultyOpen={setIsFacultyOpen}
                  handleFacultyFitChange={handleFacultyFitChange}
                  addPaperRead={addPaperRead}
                  removePaperRead={removePaperRead}
                  addCorrespondence={addCorrespondence}
                  removeCorrespondence={removeCorrespondence}
                />
                <RecommenderSection
                  appData={appData}
                  handleRecommenderChange={handleRecommenderChange}
                  addRecommender={addRecommender}
                  removeRecommender={removeRecommender}
                  isRecommenderOpen={isRecommenderOpen}
                  setIsRecommenderOpen={setIsRecommenderOpen}
                />
                <FinancialsSection
                  appData={appData}
                  handleFinancialOfferChange={handleFinancialOfferChange}
                  handleFinancialNumericChange={handleFinancialNumericChange}
                  handleFinancialCheckboxChange={handleFinancialCheckboxChange}
                  addScholarship={addScholarship}
                  removeScholarship={removeScholarship}
                  handleScholarshipChange={handleScholarshipChange}
                  isScholarshipOpen={isScholarshipOpen}
                  setIsScholarshipOpen={setIsScholarshipOpen}
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
              <div className="flex items-center justify-between p-4 border-t border-[#27272a] rounded-b-3xl">
                <div className="text-xs text-[#a1a1aa]/70" aria-label="Keyboard shortcut">
                  <kbd className="px-1.5 py-0.5 bg-[#27272a] rounded text-xs text-[#a1a1aa]" aria-label="Command key">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-[#27272a] rounded text-xs text-[#a1a1aa]" aria-label="Enter key">Enter</kbd> to save
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 text-sm font-medium text-[#a1a1aa] bg-transparent rounded-full hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#dc2626]"
                    aria-label="Cancel and close modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-full shadow-sm hover:bg-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#dc2626]"
                    aria-label="Save application"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ApplicationModal;
