import React from 'react';
import { Application, ProgramType, UniversityResult, LocationDetails } from '../types';
import { PROGRAM_TYPE_OPTIONS, ADMISSION_TERM_OPTIONS } from '../constants';
import { FieldSet, Input, Select } from './ApplicationFormUI';
import DateInput from './DateInput';
import UniversitySearchInput from './UniversitySearchInput';
import AutoCompleteInput from './AutoCompleteInput';

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
    applications: Application[];
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
    applications,
}) => {
    const handleAutoCompleteChange = (name: 'department' | 'programName') => (value: string) => {
        handleChange({
            target: { name, value },
        } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
        <FieldSet legend="Program Details">
            <div className="relative">
                <UniversitySearchInput
                    label="University Name"
                    name="universityName"
                    value={appData.universityName}
                    onChange={handleUniversityChange}
                    onSelect={handleUniversitySelect}
                    required
                />
            </div>
            <div>
                <label htmlFor="department" className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Department / School</label>
                <AutoCompleteInput
                    type="department"
                    value={appData.department}
                    onChange={handleAutoCompleteChange('department')}
                    applications={applications}
                    placeholder="Department / School"
                />
            </div>
            <div>
                <label htmlFor="programName" className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Program Name</label>
                <AutoCompleteInput
                    type="program"
                    value={appData.programName}
                    onChange={handleAutoCompleteChange('programName')}
                    applications={applications}
                    placeholder="Program Name"
                />
            </div>
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
                    <div className="absolute z-10 w-full mt-1 liquid-glass-modal-content rounded-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map((loc, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleLocationSelect(loc)}
                                className="w-full text-left px-4 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                            >
                                <div className="font-medium">{loc.city}</div>
                                <div className="text-xs text-[#a1a1aa]/70">
                                    {[loc.state, loc.country].filter(Boolean).join(', ')}
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
