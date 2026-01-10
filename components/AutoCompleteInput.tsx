import React, { useState, useRef, useEffect } from 'react';
import { useAutoComplete } from '../hooks/useAutoComplete';
import { Application } from '../types';

interface AutoCompleteInputProps {
  type: 'university' | 'program' | 'department' | 'location';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  applications: Application[];
  className?: string;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
  applications,
  className = '',
}) => {
  const { suggestions, showSuggestions, getSuggestions, hideSuggestions } = useAutoComplete(applications);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && isFocused) {
      getSuggestions(type, value);
    } else {
      hideSuggestions();
    }
  }, [value, isFocused, type, getSuggestions, hideSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        hideSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hideSuggestions]);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    hideSuggestions();
    inputRef.current?.blur();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Delay to allow suggestion click
          setTimeout(() => setIsFocused(false), 200);
        }}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-red-500 focus:border-transparent ${className}`}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <MaterialIcon name="history" className="text-sm text-slate-400" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoCompleteInput;
