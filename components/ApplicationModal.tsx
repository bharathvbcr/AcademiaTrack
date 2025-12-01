import React, { useState, useEffect } from 'react';
import {
  Application, FacultyContactStatus, ProgramType,
  LocationDetails, UniversityResult
} from '../types';
import { useUniversityData } from '../hooks/useUniversityData';
import { useDebounce } from '../hooks/useDebounce';
import { useApplicationForm } from '../hooks/useApplicationForm';
import { MaterialIcon } from './ApplicationFormUI';
import ProgramDetailsSection from './ProgramDetailsSection';
import RankingsStatusSection from './RankingsStatusSection';
import RemindersSection from './RemindersSection';
import GeneralNotesSection from './GeneralNotesSection';
import RecommenderSection from './RecommenderSection';
import FacultyContactsSection from './FacultyContactsSection';
import FinancialsSection from './FinancialsSection';
import EssaysSection from './EssaysSection';
import DocumentsSection from './DocumentsSection';
import { getLocationTimezone, searchLocation } from '../utils/locationService';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationToEdit?: Application;
  onSave: (app: Application) => void;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, applicationToEdit, onSave }) => {
  const {
    universitySuggestions,
    showSuggestions,
    setShowSuggestions,
    searchUniversities
  } = useUniversityData();

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
    handleScholarshipChange
  } = useApplicationForm(isOpen, applicationToEdit);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAppData = { ...appData };
    if (finalAppData.programType !== ProgramType.Other) {
      finalAppData.customProgramType = '';
    }
    onSave({ ...finalAppData, id: applicationToEdit?.id || '' });
    onClose();
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
            <DocumentsSection
              appData={appData}
              handleDocumentChange={handleDocumentChange}
              handleOpenFile={async () => { }} // Placeholder as file handling is complex
              handleRemoveFile={() => { }} // Placeholder
              handleAttachFile={() => { }} // Placeholder
            />
            <EssaysSection
              appData={appData}
              addEssay={addEssay}
              removeEssay={removeEssay}
              updateEssayStatus={updateEssayStatus}
              addEssayDraft={addEssayDraft}
              removeEssayDraft={removeEssayDraft}
              updateEssayDraft={updateEssayDraft}
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