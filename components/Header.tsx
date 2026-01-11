import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ProgramType, Application } from '../types';
import { PROGRAM_TYPE_OPTIONS } from '../constants';
import Tooltip from './Tooltip';
import { useClickOutside } from '../hooks/useClickOutside';
import AdvancedSearchBar from './AdvancedSearchBar';


type ViewMode = 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline';

interface HeaderProps {
  onAddNew: () => void;
  onAddFaculty: () => void;
  defaultProgramType: ProgramType;
  onSetDefaultProgramType: (type: ProgramType) => void;
  onExport: (format: 'csv' | 'json' | 'ics' | 'md' | 'pdf') => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  onShowHelp?: () => void;
  onQuickCapture?: (text: string) => void;
  applications: Application[];
  onSearch: (results: Application[]) => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const Header: React.FC<HeaderProps> = ({
  onAddNew,
  onAddFaculty,
  defaultProgramType,
  onSetDefaultProgramType,
  onExport,
  onImport,
  viewMode,
  onViewChange,
  onShowHelp,
  onQuickCapture,
  applications,
  onSearch,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const quickInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAddNewHovered, setIsAddNewHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [expandDirection, setExpandDirection] = useState<'left' | 'right'>('left');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useClickOutside(moreMenuRef, () => {
    setShowMoreMenu(false);
    setShowExportMenu(false);
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Calculate available space and determine expansion direction
  const calculateExpandDirection = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const inputWidth = 256; // w-64 = 256px
    const margin = 8; // mr-2 or ml-2 = 8px
    const totalSpaceNeeded = inputWidth + margin + 20; // Add 20px buffer

    const spaceOnLeft = buttonRect.left;
    const spaceOnRight = window.innerWidth - buttonRect.right;

    // Prefer left if space is equal or if left has enough space
    if (spaceOnLeft >= totalSpaceNeeded) {
      setExpandDirection('left');
    } else if (spaceOnRight >= totalSpaceNeeded) {
      setExpandDirection('right');
    } else {
      // If neither side has enough space, choose the side with more space
      setExpandDirection(spaceOnLeft >= spaceOnRight ? 'left' : 'right');
    }
  };

  // Calculate direction on mount, resize, and when hover state changes
  useEffect(() => {
    calculateExpandDirection();

    const handleResize = () => {
      calculateExpandDirection();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isAddNewHovered]);

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
          className={`relative p-2 rounded-lg transition-all duration-200 ${isActive
            ? 'text-[#f4f4f5] bg-[#27272a]'
            : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]'
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
    <header className="mb-6">
      {/* Top Row: Logo, Toolbar, Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <img
            src="./AcademiaTrack.png"
            alt="AcademiaTrack"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold text-[#f4f4f5] tracking-tight">
              AcademiaTrack
            </h1>
            <p className="text-[#a1a1aa] mt-1">
              Manage your academic applications efficiently
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">

          {/* Expanding Toolbar */}
          <div className="flex liquid-glass-nav p-1.5 rounded-xl items-center gap-1 transition-all duration-300 relative overflow-hidden">

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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5] transition-colors"
                >
                  <span>Applications</span>
                </button>
              )}
            </div>

            <div className="h-5 w-px bg-[#27272a] mx-1"></div>

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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5] transition-colors"
                >
                  <span>Schedule</span>
                </button>
              )}
            </div>

            <div className="h-5 w-px bg-[#27272a] mx-1"></div>

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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5] transition-colors"
                >
                  <span>Resources</span>
                </button>
              )}
            </div>
          </div>

          <div className="h-8 w-px bg-[#27272a] mx-2 hidden sm:block"></div>

          {/* More Menu */}
          <div className="relative" ref={moreMenuRef}>
            <Tooltip content="More Options">
              <button
                onClick={() => { setShowMoreMenu(!showMoreMenu); setShowExportMenu(false); }}
                className="flex items-center justify-center w-10 h-10 border border-[#27272a] rounded-xl text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                aria-label="More options"
              >
                <MaterialIcon name="more_vert" className="text-lg" />
              </button>
            </Tooltip>
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-64 liquid-glass-modal-content rounded-xl py-2 z-20">

                {/* Default Program Selector */}
                <div className="px-4 py-2">
                  <label htmlFor="default-program-type" className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider block mb-1">
                    Default Program
                  </label>
                  <select
                    id="default-program-type"
                    value={defaultProgramType}
                    onChange={(e) => onSetDefaultProgramType(e.target.value as ProgramType)}
                    className="w-full text-sm rounded-lg border-[#27272a] bg-[#09090b] py-1.5 pl-3 pr-8 text-[#f4f4f5] focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                  >
                    {PROGRAM_TYPE_OPTIONS.map(type => <option key={type} value={type} className="bg-[#1a0a0f]">{type}</option>)}
                  </select>
                </div>

                <hr className="my-2 border-[#27272a]" />

                {/* Help */}
                <button
                  onClick={() => { onShowHelp?.(); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#f4f4f5] hover:bg-[#27272a] flex items-center gap-3"
                >
                  <MaterialIcon name="help" className="text-lg text-[#a1a1aa]" />
                  <span>Help & Documentation</span>
                </button>

                <hr className="my-2 border-[#27272a]" />

                {/* Export submenu */}
                <div className="relative group">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#f4f4f5] hover:bg-[#27272a] flex items-center justify-between"
                  >
                    <span className="flex items-center gap-3">
                      <MaterialIcon name="download" className="text-lg text-[#a1a1aa]" />
                      <span>Export</span>
                    </span>
                    <MaterialIcon name={showExportMenu ? 'expand_less' : 'expand_more'} className="text-sm text-[#E8B4B8]" />
                  </button>
                  {showExportMenu && (
                    <div className="pl-10 bg-[#18181b]">
                      <button onClick={() => { onExport('csv'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a]">CSV</button>
                      <button onClick={() => { onExport('json'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a]">JSON</button>
                      <button onClick={() => { onExport('md'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a]">Markdown (.md)</button>
                      <button onClick={() => { onExport('ics'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a] flex items-center gap-2">
                        <MaterialIcon name="calendar_month" className="text-sm text-[#a1a1aa]" />Calendar (.ics)
                      </button>
                      <button onClick={() => { onExport('pdf'); setShowMoreMenu(false); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a]">PDF</button>
                    </div>
                  )}
                </div>

                {/* Import */}
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#f4f4f5] hover:bg-[#27272a] flex items-center gap-3"
                >
                  <MaterialIcon name="upload" className="text-lg text-[#a1a1aa]" />
                  <span>Import Data</span>
                </button>
              </div>
            )}
          </div>

          <label htmlFor="file-import" className="sr-only">
            Import data file
          </label>
          <input
            id="file-import"
            type="file"
            ref={fileInputRef}
            onChange={onImport}
            accept=".json,.csv"
            className="hidden"
            title="Import data file"
          />

          {/* Primary Actions - Always visible on top */}
          <Tooltip content="Add New Faculty Contact">
            <button
              onClick={onAddFaculty}
              className="flex items-center gap-2 px-3 py-2 border border-[#dc2626]/20 bg-[rgba(220,38,38,0.1)] rounded-xl text-sm font-medium text-[#f4f4f5] hover:bg-[rgba(220,38,38,0.2)] transition-colors"
            >
              <MaterialIcon name="person_add" className="text-lg text-[#a1a1aa]" />
              <span className="hidden lg:inline">Faculty</span>
            </button>
          </Tooltip>

          {/* Expandable Add New Button with Quick Capture */}
          <div
            ref={buttonRef}
            className="relative"
            onMouseEnter={() => {
              // Clear any pending timeout
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              setIsAddNewHovered(true);
            }}
            onMouseLeave={() => {
              // Only close if input is not focused (user is not typing)
              if (!isInputFocused) {
                // Delay hiding the quick input to allow time to move mouse to it
                hoverTimeoutRef.current = setTimeout(() => {
                  setIsAddNewHovered(false);
                  // Clear input when mouse leaves if it's empty
                  if (!quickInput.trim()) {
                    setQuickInput('');
                  }
                }, 300); // 300ms delay before collapsing
              }
            }}
          >
            <Tooltip content="Create New Application (Ctrl+N)">
              <motion.button
                onClick={onAddNew}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-[#dc2626] text-white rounded-xl text-sm font-medium hover:bg-[#b91c1c] transition-colors shadow-none flex-shrink-0 relative z-10 focus:outline-none focus:ring-2 focus:ring-[#fca5a5] focus:ring-offset-2 focus:ring-offset-[#09090b]"
              >
                <MaterialIcon name="add" className="text-lg" />
                <span className="hidden sm:inline">Add New</span>
              </motion.button>
            </Tooltip>

            {/* Quick Capture Input - Expands on hover (absolute positioned to avoid layout shift) */}
            {onQuickCapture && (
              <div
                className={`absolute top-0 transition-all duration-300 ease-in-out overflow-hidden z-20 ${expandDirection === 'left' ? 'right-full mr-2' : 'left-full ml-2'
                  } ${isAddNewHovered ? 'w-64 opacity-100 pointer-events-auto' : 'w-0 opacity-0 pointer-events-none'
                  }`}
                onMouseEnter={() => {
                  // Clear any pending timeout when mouse enters the input area
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                  }
                  setIsAddNewHovered(true);
                }}
                onMouseLeave={() => {
                  // Only close if input is not focused (user is not typing)
                  if (!isInputFocused) {
                    // Delay hiding when mouse leaves the input area
                    hoverTimeoutRef.current = setTimeout(() => {
                      setIsAddNewHovered(false);
                      if (!quickInput.trim()) {
                        setQuickInput('');
                      }
                    }, 300);
                  }
                }}
              >
                <div className="relative w-64">
                  <input
                    ref={quickInputRef}
                    type="text"
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && quickInput.trim()) {
                        e.preventDefault();
                        onQuickCapture(quickInput.trim());
                        setQuickInput('');
                        quickInputRef.current?.blur();
                        setIsAddNewHovered(false);
                      } else if (e.key === 'Escape') {
                        setQuickInput('');
                        quickInputRef.current?.blur();
                        setIsAddNewHovered(false);
                      }
                    }}
                    onFocus={() => {
                      // Clear any pending timeout and keep input open
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      setIsInputFocused(true);
                      setIsAddNewHovered(true);
                    }}
                    onBlur={() => {
                      // When input loses focus, allow closing after delay
                      setIsInputFocused(false);
                      // Set timeout to close if mouse has also left
                      hoverTimeoutRef.current = setTimeout(() => {
                        setIsAddNewHovered(false);
                        if (!quickInput.trim()) {
                          setQuickInput('');
                        }
                      }, 300);
                    }}
                    placeholder="Quick add: MIT, PhD CS, Dec 15"
                    className="w-full px-4 py-2 pr-10 border border-[#27272a] bg-[#18181b] rounded-xl text-sm text-[#f4f4f5] placeholder:text-[#a1a1aa]/50 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent"
                  />
                  <MaterialIcon
                    name="bolt"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-lg pointer-events-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Second Row: Compact Search Bar */}
      <div className="max-w-2xl">
        <AdvancedSearchBar
          applications={applications}
          onSearch={onSearch}
          placeholder="Search applications..."
        />
      </div>
    </header>
  );
};

export default Header;