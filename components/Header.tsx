import React, { useRef, useState } from 'react';
import { ProgramType } from '../types';
import { PROGRAM_TYPE_OPTIONS } from '../constants';
import Tooltip from './Tooltip';

type Theme = 'light' | 'dark' | 'system';

interface HeaderProps {
  onAddNew: () => void;
  onAddFaculty: () => void;
  defaultProgramType: ProgramType;
  onSetDefaultProgramType: (type: ProgramType) => void;
  onExport: (format: 'csv' | 'json' | 'ics') => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  viewMode: 'list' | 'kanban' | 'calendar' | 'budget';
  onViewChange: (mode: 'list' | 'kanban' | 'calendar' | 'budget') => void;
  theme: Theme;
  cycleTheme: () => void;
  onShowHelp?: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const getThemeIcon = (theme: Theme): string => {
  switch (theme) {
    case 'light': return 'light_mode';
    case 'dark': return 'dark_mode';
    case 'system': return 'computer';
  }
};

const getThemeTooltip = (theme: Theme): string => {
  switch (theme) {
    case 'light': return 'Light Mode (Click to change)';
    case 'dark': return 'Dark Mode (Click to change)';
    case 'system': return 'System Theme (Click to change)';
  }
};

const Header: React.FC<HeaderProps> = ({
  onAddNew,
  onAddFaculty,
  defaultProgramType,
  onSetDefaultProgramType,
  onExport,
  onImport,
  viewMode,
  onViewChange,
  theme,
  cycleTheme,
  onShowHelp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          AcademiaTrack
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your academic applications efficiently
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="default-program-type" className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap hidden lg:block">
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

        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-full border border-slate-200 dark:border-slate-600">
          <Tooltip content="List View">
            <button
              onClick={() => onViewChange('list')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              aria-label="List View"
            >
              <MaterialIcon name="list" className="text-lg" />
            </button>
          </Tooltip>
          <Tooltip content="Kanban Board">
            <button
              onClick={() => onViewChange('kanban')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              aria-label="Kanban View"
            >
              <MaterialIcon name="view_kanban" className="text-lg" />
            </button>
          </Tooltip>
          <Tooltip content="Calendar View">
            <button
              onClick={() => onViewChange('calendar')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              aria-label="Calendar View"
            >
              <MaterialIcon name="calendar_month" className="text-lg" />
            </button>
          </Tooltip>
          <Tooltip content="Budget Tracker">
            <button
              onClick={() => onViewChange('budget')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'budget' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              aria-label="Budget View"
            >
              <MaterialIcon name="attach_money" className="text-lg" />
            </button>
          </Tooltip>
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

        {/* More Menu - Groups: Theme, Help, Export, Import */}
        <div className="relative">
          <Tooltip content="More Options">
            <button
              onClick={() => { setShowMoreMenu(!showMoreMenu); setShowExportMenu(false); }}
              className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              aria-label="More options"
            >
              <MaterialIcon name="more_vert" className="text-lg" />
            </button>
          </Tooltip>
          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-20">
              {/* Theme */}
              <button
                onClick={() => { cycleTheme(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <MaterialIcon name={getThemeIcon(theme)} className="text-lg" />
                <span>{theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'System Theme'}</span>
              </button>

              {/* Help */}
              <button
                onClick={() => { onShowHelp?.(); setShowMoreMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <MaterialIcon name="help" className="text-lg" />
                <span>Help & Documentation</span>
              </button>

              <hr className="my-2 border-slate-200 dark:border-slate-700" />

              {/* Export submenu */}
              <div className="relative group">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                >
                  <span className="flex items-center gap-3">
                    <MaterialIcon name="download" className="text-lg" />
                    <span>Export</span>
                  </span>
                  <MaterialIcon name={showExportMenu ? 'expand_less' : 'expand_more'} className="text-sm" />
                </button>
                {showExportMenu && (
                  <div className="pl-10 bg-slate-50 dark:bg-slate-700/30">
                    <button onClick={() => { onExport('csv'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">CSV</button>
                    <button onClick={() => { onExport('json'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">JSON</button>
                    <button onClick={() => { onExport('ics'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                      <MaterialIcon name="calendar_month" className="text-sm" />Calendar (.ics)
                    </button>
                  </div>
                )}
              </div>

              {/* Import */}
              <button
                onClick={() => { fileInputRef.current?.click(); setShowMoreMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <MaterialIcon name="upload" className="text-lg" />
                <span>Import Data</span>
              </button>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onImport}
          accept=".json"
          className="hidden"
        />

        {/* Primary Actions */}
        <Tooltip content="Add New Faculty Contact">
          <button
            onClick={onAddFaculty}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <MaterialIcon name="person_add" className="text-lg" />
            <span className="hidden lg:inline">Faculty</span>
          </button>
        </Tooltip>

        <Tooltip content="Create New Application (Ctrl+N)">
          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
          >
            <MaterialIcon name="add" className="text-lg" />
            <span className="hidden sm:inline">Add New</span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
};

export default Header;