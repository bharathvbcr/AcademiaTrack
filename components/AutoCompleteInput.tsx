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
        className={`w-full px-4 py-2 border border-[#27272a] bg-[#18181b] rounded-lg liquid-glass-input focus:ring-2 focus:ring-[#dc2626] focus:border-transparent text-[#f4f4f5] placeholder:text-[#a1a1aa]/50 ${className}`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 liquid-glass-modal-content rounded-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-[#27272a] flex items-center gap-2 text-[#f4f4f5]"
            >
              <MaterialIcon name="history" className="text-sm text-[#a1a1aa]" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoCompleteInput;
