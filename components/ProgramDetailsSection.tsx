import React from 'react';
import { Application, ProgramType, UniversityResult, LocationDetails } from '../types';
import { PROGRAM_TYPE_OPTIONS, ADMISSION_TERM_OPTIONS } from '../constants';
import { FieldSet, Input, Select } from './ApplicationFormUI';
import DateInput from './DateInput';

interface ProgramDetailsSectionProps {
    appData: Omit<Application, 'id'>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleUniversityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleUniversitySelect: (uni: UniversityResult) => void;
    universitySuggestions: UniversityResult[];
    showSuggestions: boolean;
    setShowSuggestions: (show: boolean) => void;
    handleLocationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleLocationSelect: (loc: LocationDetails) => void;
    locationSuggestions: LocationDetails[];
    showLocationSuggestions: boolean;
    setShowLocationSuggestions: (show: boolean) => void;
}

const ProgramDetailsSection: React.FC<ProgramDetailsSectionProps> = ({
    appData,
    handleChange,
    handleUniversityChange,
    handleUniversitySelect,
    universitySuggestions,
    showSuggestions,
    setShowSuggestions,
    handleLocationChange,
    handleLocationSelect,
    locationSuggestions,
    showLocationSuggestions,
    setShowLocationSuggestions,
}) => {
    return (
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
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                                <div className="text-xs text-slate-500">{[uni['state-province'], uni.country].filter(Boolean).join(', ')}</div>
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
                                <div className="font-medium">
                                    {[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </FieldSet>
    );
};

export default ProgramDetailsSection;
