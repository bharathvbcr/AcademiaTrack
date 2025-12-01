import React, { useRef, useEffect, useState } from 'react';
import { UniversityResult } from '../types';
import { useUniversityData } from '../hooks/useUniversityData';
import { Input } from './ApplicationFormUI';

interface UniversitySearchInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelect: (uni: UniversityResult) => void;
    label?: string;
    required?: boolean;
    name?: string;
    placeholder?: string;
    error?: string;
}

const UniversitySearchInput: React.FC<UniversitySearchInputProps> = ({
    value,
    onChange,
    onSelect,
    label = "University",
    required = false,
    name = "universityName",
    placeholder = "Type to search...",
    error
}) => {
    const {
        universitySuggestions,
        showSuggestions,
        setShowSuggestions,
        searchUniversities
    } = useUniversityData();

    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Determine if it's a new university (has value, no exact match in suggestions)
    // We only show this if the user has typed something and suggestions are loaded/empty
    const isNew = value.length >= 3 &&
        !universitySuggestions.some(u => u.name.toLowerCase() === value.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && event.target instanceof Node && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setShowSuggestions]);

    useEffect(() => {
        if (showSuggestions) {
            setSelectedIndex(-1);
        }
    }, [showSuggestions, universitySuggestions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e);
        searchUniversities(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || universitySuggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < universitySuggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0) {
                handleSelect(universitySuggestions[selectedIndex]);
            } else if (universitySuggestions.length > 0) {
                // Optional: Select first if none selected, or just close. 
                // Current behavior in plan: select first if visible.
                handleSelect(universitySuggestions[0]);
            } else {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleSelect = (uni: UniversityResult) => {
        onSelect(uni);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    };

    return (
        <div className="relative" ref={suggestionsRef}>
            <div className="relative">
                <Input
                    label={label}
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => value.length >= 3 && setShowSuggestions(true)}
                    required={required}
                    placeholder={placeholder}
                    autoComplete="off"
                    error={error}
                />
                {isNew && value.length > 0 && !showSuggestions && (
                    <div className="absolute right-3 top-[34px] pointer-events-none">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            New
                        </span>
                    </div>
                )}
            </div>
            {showSuggestions && universitySuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {universitySuggestions.map((uni, index) => (
                        <div
                            key={index}
                            className={`px-4 py-2 cursor-pointer transition-colors ${index === selectedIndex
                                    ? 'bg-slate-100 dark:bg-slate-800'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            onClick={() => handleSelect(uni)}
                        >
                            <div className="font-medium text-slate-900 dark:text-slate-100">{uni.name}</div>
                            <div className="text-xs text-slate-500">
                                {[uni['state-province'], uni.country].filter(Boolean).join(', ')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UniversitySearchInput;
