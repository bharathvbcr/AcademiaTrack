import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Application, ApplicationStatus, ProgramType } from '../types';

interface Command {
  id: string;
  label: string;
  category: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  onNewApplication: () => void;
  onViewChange: (view: 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline') => void;
  onOpenApplication: (id: string) => void;
  onBulkAction: (action: string) => void;
  onFilter: (query: string) => void;
  onExport: (format: 'csv' | 'json' | 'ics') => void;
  onImport: () => void;
  onSettings: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  applications,
  onNewApplication,
  onViewChange,
  onOpenApplication,
  onBulkAction,
  onFilter,
  onExport,
  onImport,
  onSettings,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(() => {
    const cmds: Command[] = [
      // Navigation
      { id: 'view-list', label: 'Switch to List View', category: 'Navigation', icon: 'list', shortcut: 'Ctrl+1', action: () => { onViewChange('list'); onClose(); }, keywords: ['list', 'view', 'table'] },
      { id: 'view-kanban', label: 'Switch to Kanban View', category: 'Navigation', icon: 'view_kanban', shortcut: 'Ctrl+2', action: () => { onViewChange('kanban'); onClose(); }, keywords: ['kanban', 'board', 'view'] },
      { id: 'view-calendar', label: 'Switch to Calendar View', category: 'Navigation', icon: 'calendar_month', shortcut: 'Ctrl+3', action: () => { onViewChange('calendar'); onClose(); }, keywords: ['calendar', 'view', 'schedule'] },
      { id: 'view-timeline', label: 'Switch to Timeline View', category: 'Navigation', icon: 'timeline', shortcut: 'Ctrl+7', action: () => { onViewChange('timeline'); onClose(); }, keywords: ['timeline', 'view'] },
      { id: 'view-budget', label: 'Switch to Budget View', category: 'Navigation', icon: 'attach_money', shortcut: 'Ctrl+4', action: () => { onViewChange('budget'); onClose(); }, keywords: ['budget', 'money', 'finance'] },
      { id: 'view-faculty', label: 'Switch to Faculty View', category: 'Navigation', icon: 'school', shortcut: 'Ctrl+5', action: () => { onViewChange('faculty'); onClose(); }, keywords: ['faculty', 'professor'] },
      { id: 'view-recommenders', label: 'Switch to Recommenders View', category: 'Navigation', icon: 'assignment_ind', shortcut: 'Ctrl+6', action: () => { onViewChange('recommenders'); onClose(); }, keywords: ['recommenders', 'letters'] },

      // Actions
      { id: 'new-application', label: 'Create New Application', category: 'Actions', icon: 'add', shortcut: 'Ctrl+N', action: () => { onNewApplication(); onClose(); }, keywords: ['new', 'create', 'add'] },
      { id: 'import', label: 'Import Data', category: 'Actions', icon: 'upload', action: () => { onImport(); onClose(); }, keywords: ['import', 'upload', 'load'] },
      { id: 'export-csv', label: 'Export to CSV', category: 'Actions', icon: 'download', action: () => { onExport('csv'); onClose(); }, keywords: ['export', 'csv', 'download'] },
      { id: 'export-json', label: 'Export to JSON', category: 'Actions', icon: 'download', action: () => { onExport('json'); onClose(); }, keywords: ['export', 'json', 'download'] },
      { id: 'export-ics', label: 'Export to Calendar (ICS)', category: 'Actions', icon: 'calendar_month', action: () => { onExport('ics'); onClose(); }, keywords: ['export', 'calendar', 'ics'] },
      { id: 'settings', label: 'Open Settings', category: 'Actions', icon: 'settings', action: () => { onSettings(); onClose(); }, keywords: ['settings', 'preferences', 'config'] },

      // Bulk Actions
      { id: 'bulk-status', label: 'Bulk Change Status', category: 'Bulk Actions', icon: 'swap_horiz', action: () => { onBulkAction('status'); onClose(); }, keywords: ['bulk', 'status', 'change'] },
      { id: 'bulk-tag', label: 'Bulk Manage Tags', category: 'Bulk Actions', icon: 'label', action: () => { onBulkAction('tags'); onClose(); }, keywords: ['bulk', 'tag', 'label'] },
      { id: 'bulk-export', label: 'Bulk Export Selected', category: 'Bulk Actions', icon: 'file_download', action: () => { onBulkAction('export'); onClose(); }, keywords: ['bulk', 'export', 'selected'] },

      // Quick Filters
      { id: 'filter-due-week', label: 'Filter: Due This Week', category: 'Filters', icon: 'schedule', action: () => { onFilter('due:week'); onClose(); }, keywords: ['filter', 'due', 'week', 'deadline'] },
      { id: 'filter-due-month', label: 'Filter: Due This Month', category: 'Filters', icon: 'calendar_month', action: () => { onFilter('due:month'); onClose(); }, keywords: ['filter', 'due', 'month', 'deadline'] },
      { id: 'filter-submitted', label: 'Filter: Submitted Applications', category: 'Filters', icon: 'check_circle', action: () => { onFilter('status:submitted'); onClose(); }, keywords: ['filter', 'submitted', 'status'] },
      { id: 'filter-interview', label: 'Filter: Interview Stage', category: 'Filters', icon: 'videocam', action: () => { onFilter('status:interview'); onClose(); }, keywords: ['filter', 'interview', 'status'] },
      { id: 'filter-accepted', label: 'Filter: Accepted Applications', category: 'Filters', icon: 'celebration', action: () => { onFilter('status:accepted'); onClose(); }, keywords: ['filter', 'accepted', 'status'] },
    ];

    // Add application-specific commands
    applications.slice(0, 10).forEach(app => {
      cmds.push({
        id: `app-${app.id}`,
        label: `Open: ${app.universityName} - ${app.programName}`,
        category: 'Applications',
        icon: 'school',
        action: () => { onOpenApplication(app.id); onClose(); },
        keywords: [app.universityName.toLowerCase(), app.programName.toLowerCase(), app.department?.toLowerCase() || '', app.location?.toLowerCase() || ''],
      });
    });

    return cmds;
  }, [applications, onNewApplication, onViewChange, onOpenApplication, onBulkAction, onFilter, onExport, onImport, onSettings, onClose]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => {
      const matchesLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchesCategory = cmd.category.toLowerCase().includes(lowerQuery);
      const matchesKeywords = cmd.keywords.some(kw => kw.includes(lowerQuery));
      return matchesLabel || matchesCategory || matchesKeywords;
    });
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: Command[] } = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (filteredCommands.length > 0 && selectedIndex >= filteredCommands.length) {
      setSelectedIndex(0);
    }
  }, [filteredCommands.length, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
              <img src="./AcademiaTrack.png" alt="" className="w-6 h-6 object-contain" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 text-lg placeholder-slate-400"
                autoFocus
                aria-label="Command palette search"
              />
              <kbd className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600">
                ESC
              </kbd>
            </div>

            {/* Commands List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <MaterialIcon name="search_off" className="text-4xl mb-2 opacity-50" />
                  <p>No commands found</p>
                </div>
              ) : (
                Object.entries(groupedCommands).map(([category, cmds]) => (
                  <div key={category} className="py-2">
                    <div className="px-4 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {category}
                    </div>
                    {cmds.map((cmd, idx) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <MaterialIcon
                            name={cmd.icon}
                            className={`text-xl ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{cmd.label}</div>
                          </div>
                          {cmd.shortcut && (
                            <kbd className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">Enter</kbd>
                  <span>Select</span>
                </span>
              </div>
              <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;
