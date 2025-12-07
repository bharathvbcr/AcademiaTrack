import React, { useRef, useState, useEffect } from 'react';
import { ProgramType } from '../types';
import { PROGRAM_TYPE_OPTIONS } from '../constants';
import Tooltip from './Tooltip';

type Theme = 'light' | 'dark' | 'system';
type ViewMode = 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline';

interface HeaderProps {
  onAddNew: () => void;
  onAddFaculty: () => void;
  defaultProgramType: ProgramType;
  onSetDefaultProgramType: (type: ProgramType) => void;
  onExport: (format: 'csv' | 'json' | 'ics') => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
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

  // Track mouse hover for expanding toolbar
  const [hoveredSection, setHoveredSection] = useState<'apps' | 'schedule' | 'resources' | null>(null);

  // Track last used views
  const [lastAppView, setLastAppView] = useState<ViewMode>('list');
  const [lastScheduleView, setLastScheduleView] = useState<ViewMode>('timeline');
  const [lastResourceView, setLastResourceView] = useState<ViewMode>('faculty');

  useEffect(() => {
    if (['list', 'kanban', 'budget'].includes(viewMode)) {
      setLastAppView(viewMode);
    } else if (['timeline', 'calendar'].includes(viewMode)) {
      setLastScheduleView(viewMode);
    } else if (['faculty', 'recommenders'].includes(viewMode)) {
      setLastResourceView(viewMode);
    }
  }, [viewMode]);

  const isAppView = ['list', 'kanban', 'budget'].includes(viewMode);
  const isScheduleView = ['timeline', 'calendar'].includes(viewMode);
  const isResourceView = ['faculty', 'recommenders'].includes(viewMode);

  const showApps = isAppView || hoveredSection === 'apps';
  const showSchedule = isScheduleView || hoveredSection === 'schedule';
  const showResources = isResourceView || hoveredSection === 'resources';

  // Helper for Icon Buttons
  const ViewIconButton = ({ mode, icon, label }: { mode: ViewMode, icon: string, label: string }) => {
    const isActive = viewMode === mode;
    return (
      <Tooltip content={label}>
        <button
          onClick={() => onViewChange(mode)}
          className={`relative p-2 rounded-lg transition-all duration-300 ${isActive
            ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/40 ring-1 ring-white/20 scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
        >
          <MaterialIcon name={icon} className="text-xl" />
          {isActive && (
            <div className="absolute inset-0 rounded-lg bg-white/10 opacity-50 pointer-events-none filter blur-[1px]"></div>
          )}
        </button>
      </Tooltip>
    );
  };

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

        {/* Expanding Toolbar */}
        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-600 items-center gap-1 transition-all duration-300">

          {/* Applications Section */}
          <div
            className="flex items-center"
            onMouseEnter={() => setHoveredSection('apps')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            {showApps ? (
              <div className="flex items-center gap-1 animate-fadeIn px-1">
                <ViewIconButton mode="list" icon="list" label="List View" />
                <ViewIconButton mode="kanban" icon="view_kanban" label="Kanban Board" />
                <ViewIconButton mode="budget" icon="attach_money" label="Budget" />
              </div>
            ) : (
              <button
                onClick={() => onViewChange(lastAppView)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors"
              >
                <span>Applications</span>
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

          {/* Schedule Section */}
          <div
            className="flex items-center"
            onMouseEnter={() => setHoveredSection('schedule')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            {showSchedule ? (
              <div className="flex items-center gap-1 animate-fadeIn px-1">
                <ViewIconButton mode="timeline" icon="timeline" label="Timeline" />
                <ViewIconButton mode="calendar" icon="calendar_month" label="Calendar" />
              </div>
            ) : (
              <button
                onClick={() => onViewChange(lastScheduleView)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors"
              >
                <span>Schedule</span>
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

          {/* Resources Section */}
          <div
            className="flex items-center"
            onMouseEnter={() => setHoveredSection('resources')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            {showResources ? (
              <div className="flex items-center gap-1 animate-fadeIn px-1">
                <ViewIconButton mode="faculty" icon="school" label="Faculty" />
                <ViewIconButton mode="recommenders" icon="assignment_ind" label="Recommenders" />
              </div>
            ) : (
              <button
                onClick={() => onViewChange(lastResourceView)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors"
              >
                <span>Resources</span>
              </button>
            )}
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

        {/* More Menu */}
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
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-20">

              {/* Default Program Selector */}
              <div className="px-4 py-2">
                <label htmlFor="default-program-type" className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Default Program
                </label>
                <select
                  id="default-program-type"
                  value={defaultProgramType}
                  onChange={(e) => onSetDefaultProgramType(e.target.value as ProgramType)}
                  className="w-full text-sm rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 py-1.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROGRAM_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <hr className="my-2 border-slate-200 dark:border-slate-700" />

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
          accept=".json,.csv"
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