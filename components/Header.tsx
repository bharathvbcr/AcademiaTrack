import React from 'react';
import { ProgramType } from '../types';
import { PROGRAM_TYPE_OPTIONS } from '../constants';

interface HeaderProps {
  onAddNew: () => void;
  onAddFaculty: () => void;
  defaultProgramType: ProgramType;
  onSetDefaultProgramType: (type: ProgramType) => void;
  onExport: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const Header: React.FC<HeaderProps> = ({ onAddNew, onAddFaculty, defaultProgramType, onSetDefaultProgramType, onExport }) => {
  return (
    <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/50 flex-wrap gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">AcademiaTrack</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your personal application dashboard.</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
            <label htmlFor="default-program-type" className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Default:
            </label>
            <select
                id="default-program-type"
                value={defaultProgramType}
                onChange={(e) => onSetDefaultProgramType(e.target.value as ProgramType)}
                className="text-sm rounded-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-1.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                aria-label="Set default program type for new applications"
            >
                {PROGRAM_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700/50 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 transition-all"
          aria-label="Export data to CSV"
        >
          <MaterialIcon name="download" />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={onAddFaculty}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700/50 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 transition-all"
          aria-label="Add a new faculty contact"
        >
          <MaterialIcon name="person_add" />
          <span className="hidden sm:inline">Add Faculty</span>
        </button>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 pl-3 pr-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-full shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 transition-all"
        >
          <MaterialIcon name="add" />
          <span className="hidden sm:inline">Add New</span>
        </button>
      </div>
    </header>
  );
};

export default Header;