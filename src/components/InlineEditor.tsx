import React, { useState, useEffect, useRef } from 'react';
import { ApplicationStatus, DocumentStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';

export type EditableField = 'status' | 'deadline' | 'applicationFee' | 'tags' | 'admissionChance';

interface InlineEditorProps {
  field: EditableField;
  value: any;
  onSave: (value: any) => void;
  onCancel: () => void;
  options?: string[];
  type?: 'text' | 'number' | 'date' | 'select' | 'tags';
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  field,
  value,
  onSave,
  onCancel,
  options,
  type,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    inputRef.current?.focus();
    if (inputRef.current && 'select' in inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    // Small delay to allow Enter key to fire first
    setTimeout(() => {
      onSave(editValue);
    }, 100);
  };

  // Determine field type if not provided
  const fieldType = type || (() => {
    if (field === 'deadline') return 'date';
    if (field === 'applicationFee' || field === 'admissionChance') return 'number';
    if (field === 'status') return 'select';
    if (field === 'tags') return 'tags';
    return 'text';
  })();

  if (fieldType === 'select') {
    const selectOptions = options || (field === 'status' ? STATUS_OPTIONS : []);
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 min-w-[120px]"
        aria-label={`Edit ${field}`}
        title={`Edit ${field}`}
      >
        {selectOptions.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (fieldType === 'date') {
    const dateValue = editValue ? new Date(editValue).toISOString().split('T')[0] : '';
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={dateValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
        aria-label={`Edit ${field}`}
        title={`Edit ${field}`}
      />
    );
  }

  if (fieldType === 'number') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        value={editValue || 0}
        onChange={(e) => setEditValue(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        min={field === 'admissionChance' ? 0 : undefined}
        max={field === 'admissionChance' ? 100 : undefined}
        className="px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 w-20"
        aria-label={`Edit ${field}`}
        title={`Edit ${field}`}
      />
    );
  }

  // Default: text input
  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={editValue || ''}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
      aria-label={`Edit ${field}`}
      title={`Edit ${field}`}
      placeholder={`Edit ${field}`}
    />
  );
};
