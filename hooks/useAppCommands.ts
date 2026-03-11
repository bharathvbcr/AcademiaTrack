import { useEffect } from 'react';
import { AppCommand } from '../types/commands';
import { Application } from '../types';
import { FilterGroup, SavedFilter } from './useAdvancedFilter';
import { SearchQuery } from './useAdvancedSearch';
import { useCommandRegistry } from '../contexts/CommandContext';

interface AppCommandsProps {
  openCommandPalette: () => void;
  openModal: (app: Application | null) => void;
  openSettings: () => void;
  setSettingsTab: (tab: 'shortcuts' | 'views' | 'general' | 'fields' | 'kanban' | 'automation') => void;
  setViewMode: (view: 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline') => void;
  handleExport: (format: 'csv' | 'json' | 'ics' | 'md' | 'pdf', selectedFields?: string[]) => void;
  setIsBulkOperationsOpen: (open: boolean) => void;
  setIsQuickCaptureOpen: (open: boolean) => void;
  setIsHelpOpen: (open: boolean) => void;
  setIsAdvancedFilterOpen: (open: boolean) => void;
  setIsAutomationRulesOpen: (open: boolean) => void;
  setIsKanbanConfigOpen: (open: boolean) => void;
  setIsViewPresetOpen: (open: boolean) => void;
  setIsComparisonOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearActiveFilter: () => void;
  setActiveFilter: (filter: FilterGroup | null) => void;
  loadSavedFilter: (id: string) => SavedFilter | null;
  loadSavedSearch: (id: string) => string | null;
  savedSearches: SearchQuery[];
  searchHistory: string[];
  applications: Application[];
  savedFilters: SavedFilter[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const trimLabel = (value: string) => value.trim().toLowerCase();

export const useAppCommands = ({
  openCommandPalette,
  openModal,
  openSettings,
  setSettingsTab,
  setViewMode,
  handleExport,
  setIsBulkOperationsOpen,
  setIsQuickCaptureOpen,
  setIsHelpOpen,
  setIsAdvancedFilterOpen,
  setIsAutomationRulesOpen,
  setIsKanbanConfigOpen,
  setIsViewPresetOpen,
  setIsComparisonOpen,
  setSearchQuery,
  clearActiveFilter,
  setActiveFilter,
  loadSavedFilter,
  loadSavedSearch,
  savedSearches,
  searchHistory,
  applications,
  savedFilters,
  undo,
  redo,
  canUndo,
  canRedo,
}: AppCommandsProps) => {
  const { registerCommand, unregisterCommand } = useCommandRegistry();
  const clearTransientSearchState = () => {
    setActiveFilter(null);
    setSearchQuery('');
  };

  useEffect(() => {
    const globalCommands: AppCommand[] = [
      {
        id: 'open-command-palette',
        title: 'Open Command Palette',
        group: 'Navigation',
        type: 'navigation',
        icon: 'search',
        shortcut: 'Ctrl+K',
        shortcutScope: 'global',
        section: 'navigation',
        keywords: ['palette', 'command', 'omnibox'],
        execute: openCommandPalette,
      },
      {
        id: 'new-application',
        title: 'Create New Application',
        group: 'Actions',
        type: 'action',
        icon: 'add',
        shortcut: 'Ctrl+N',
        shortcutScope: 'local',
        section: 'actions',
        keywords: ['new', 'create', 'add'],
        execute: () => openModal(null),
      },
      {
        id: 'quick-capture',
        title: 'Open Quick Capture',
        group: 'Actions',
        type: 'action',
        icon: 'bolt',
        shortcut: 'Ctrl+Shift+Q',
        section: 'actions',
        keywords: ['quick', 'capture', 'add'],
        execute: () => setIsQuickCaptureOpen(true),
      },
      {
        id: 'import',
        title: 'Import Data',
        group: 'Actions',
        type: 'action',
        icon: 'upload',
        shortcut: 'Ctrl+O',
        section: 'actions',
        keywords: ['import', 'upload', 'load'],
        execute: () => {
          document.getElementById('file-import')?.click();
        },
      },
      {
        id: 'export-csv',
        title: 'Export to CSV',
        group: 'Actions',
        type: 'action',
        icon: 'download',
        shortcut: 'Ctrl+Shift+E',
        section: 'actions',
        keywords: ['export', 'csv', 'download'],
        execute: () => handleExport('csv'),
      },
      {
        id: 'export-json',
        title: 'Export to JSON',
        group: 'Actions',
        type: 'action',
        icon: 'download',
        section: 'actions',
        keywords: ['export', 'json', 'download'],
        execute: () => handleExport('json'),
      },
      {
        id: 'export-ics',
        title: 'Export to Calendar (ICS)',
        group: 'Actions',
        type: 'action',
        icon: 'calendar_month',
        section: 'actions',
        keywords: ['export', 'calendar', 'ics'],
        execute: () => handleExport('ics'),
      },
      {
        id: 'export-pdf',
        title: 'Export to PDF',
        group: 'Actions',
        type: 'action',
        icon: 'picture_as_pdf',
        section: 'actions',
        keywords: ['export', 'pdf'],
        execute: () => handleExport('pdf'),
      },
      {
        id: 'undo',
        title: 'Undo Last Action',
        group: 'System',
        type: 'action',
        icon: 'undo',
        shortcut: 'Ctrl+Z',
        section: 'system',
        keywords: ['undo', 'back'],
        execute: undo,
        isVisible: () => canUndo,
      },
      {
        id: 'redo',
        title: 'Redo Last Action',
        group: 'System',
        type: 'action',
        icon: 'redo',
        shortcut: 'Ctrl+Y',
        section: 'system',
        keywords: ['redo', 'forward'],
        execute: redo,
        isVisible: () => canRedo,
      },
      {
        id: 'open-settings',
        title: 'Open Settings',
        group: 'Settings',
        type: 'settings',
        icon: 'settings',
        section: 'settings',
        keywords: ['settings', 'preferences', 'config'],
        execute: () => {
          setSettingsTab('general');
          openSettings();
        },
      },
      {
        id: 'open-settings-shortcuts',
        title: 'Open Keyboard Shortcuts',
        group: 'Settings',
        type: 'settings',
        icon: 'keyboard',
        section: 'settings',
        keywords: ['settings', 'shortcuts'],
        execute: () => {
          setSettingsTab('shortcuts');
          openSettings();
        },
      },
      {
        id: 'open-settings-views',
        title: 'Open View Settings',
        group: 'Settings',
        type: 'settings',
        icon: 'palette',
        section: 'settings',
        keywords: ['settings', 'views'],
        execute: () => {
          setSettingsTab('views');
          openSettings();
        },
      },
      {
        id: 'open-settings-fields',
        title: 'Open Custom Fields',
        group: 'Settings',
        type: 'settings',
        icon: 'view_week',
        section: 'settings',
        keywords: ['settings', 'fields'],
        execute: () => {
          setSettingsTab('fields');
          openSettings();
        },
      },
      {
        id: 'open-kanban-config',
        title: 'Open Kanban Configuration',
        group: 'Settings',
        type: 'settings',
        icon: 'view_kanban',
        section: 'settings',
        keywords: ['kanban', 'configuration'],
        execute: () => setIsKanbanConfigOpen(true),
      },
      {
        id: 'open-automation-rules',
        title: 'Open Automation Rules',
        group: 'Settings',
        type: 'settings',
        icon: 'smart_toy',
        section: 'settings',
        keywords: ['automation', 'rules'],
        execute: () => setIsAutomationRulesOpen(true),
      },
      {
        id: 'open-view-presets',
        title: 'Open View Presets',
        group: 'Settings',
        type: 'settings',
        icon: 'bookmarks',
        section: 'settings',
        keywords: ['presets', 'views'],
        execute: () => setIsViewPresetOpen(true),
      },
      {
        id: 'open-bulk-operations',
        title: 'Open Bulk Operations',
        group: 'Actions',
        type: 'action',
        icon: 'swap_horiz',
        section: 'actions',
        keywords: ['bulk', 'operations'],
        execute: () => setIsBulkOperationsOpen(true),
      },
      {
        id: 'open-comparison',
        title: 'Open Comparison View',
        group: 'Actions',
        type: 'action',
        icon: 'compare',
        section: 'actions',
        keywords: ['compare', 'applications'],
        execute: () => setIsComparisonOpen(true),
      },
      {
        id: 'open-help',
        title: 'Open Help',
        group: 'System',
        type: 'action',
        icon: 'help',
        section: 'system',
        keywords: ['help', 'docs'],
        execute: () => setIsHelpOpen(true),
      },
      {
        id: 'advanced-filter-builder',
        title: 'Open Advanced Filter Builder',
        group: 'Search',
        type: 'search',
        icon: 'filter_alt',
        section: 'search',
        shortcut: 'Ctrl+F',
        keywords: ['filter', 'builder'],
        execute: () => setIsAdvancedFilterOpen(true),
      },
      {
        id: 'clear-active-filter',
        title: 'Clear Active Filter',
        group: 'Search',
        type: 'filter',
        icon: 'filter_alt_off',
        section: 'search',
        keywords: ['clear', 'filter'],
        execute: clearActiveFilter,
      },
      {
        id: 'view-list',
        title: 'Switch to List View',
        group: 'Navigation',
        type: 'navigation',
        icon: 'list',
        section: 'navigation',
        shortcut: 'Ctrl+1',
        keywords: ['list', 'view', 'table'],
        execute: () => setViewMode('list'),
      },
      {
        id: 'view-kanban',
        title: 'Switch to Kanban View',
        group: 'Navigation',
        type: 'navigation',
        icon: 'view_kanban',
        section: 'navigation',
        shortcut: 'Ctrl+2',
        keywords: ['kanban', 'board', 'view'],
        execute: () => setViewMode('kanban'),
      },
      {
        id: 'view-calendar',
        title: 'Switch to Calendar View',
        group: 'Navigation',
        type: 'navigation',
        icon: 'calendar_month',
        section: 'navigation',
        shortcut: 'Ctrl+3',
        keywords: ['calendar', 'view', 'schedule'],
        execute: () => setViewMode('calendar'),
      },
      {
        id: 'view-budget',
        title: 'Switch to Budget View',
        group: 'Navigation',
        type: 'navigation',
        icon: 'attach_money',
        section: 'navigation',
        shortcut: 'Ctrl+4',
        keywords: ['budget', 'finance'],
        execute: () => setViewMode('budget'),
      },
      {
        id: 'view-faculty',
        title: 'Switch to Faculty View',
        group: 'Navigation',
        type: 'navigation',
        icon: 'school',
        section: 'navigation',
        shortcut: 'Ctrl+5',
        keywords: ['faculty', 'resources'],
        execute: () => setViewMode('faculty'),
      },
      {
        id: 'view-recommenders',
        title: 'Switch to Recommenders View',
        group: 'Navigation',
        type: 'navigation',
        icon: 'assignment_ind',
        section: 'navigation',
        shortcut: 'Ctrl+6',
        keywords: ['recommenders', 'letters'],
        execute: () => setViewMode('recommenders'),
      },
      {
        id: 'view-timeline',
        title: 'Switch to Timeline View',
        group: 'Navigation',
        type: 'navigation',
        icon: 'timeline',
        section: 'navigation',
        shortcut: 'Ctrl+7',
        keywords: ['timeline', 'view'],
        execute: () => setViewMode('timeline'),
      },
    ];

    globalCommands.forEach(cmd => registerCommand(cmd));

    return () => {
      globalCommands.forEach(cmd => unregisterCommand(cmd.id));
    };
  }, [
    registerCommand,
    unregisterCommand,
    openCommandPalette,
    openModal,
    openSettings,
    setSettingsTab,
    setViewMode,
    handleExport,
    setIsBulkOperationsOpen,
    setIsQuickCaptureOpen,
    setIsHelpOpen,
    setIsAdvancedFilterOpen,
    setIsAutomationRulesOpen,
    setIsKanbanConfigOpen,
    setIsViewPresetOpen,
    setIsComparisonOpen,
    undo,
    redo,
    canUndo,
    canRedo,
    clearActiveFilter,
  ]);

  useEffect(() => {
    const searchCommands: AppCommand[] = [
      ...savedSearches.map((entry): AppCommand => ({
        id: `saved-search-${entry.id}`,
        title: `Saved Search: ${entry.name}`,
        subtitle: entry.query,
        group: 'Search',
        type: 'search',
        icon: 'bookmark',
        section: 'search',
        keywords: [trimLabel(entry.name), trimLabel(entry.query)],
        execute: () => {
          clearTransientSearchState();
          const query = loadSavedSearch(entry.id);
          if (query) {
            setSearchQuery(query);
          }
        },
      })),
      ...searchHistory.map((query, index): AppCommand => ({
        id: `search-history-${index}-${query}`,
        title: query,
        group: 'Search',
        type: 'search',
        icon: 'history',
        section: 'search',
        keywords: [trimLabel(query)],
        execute: () => {
          clearTransientSearchState();
          setSearchQuery(query);
        },
      })),
      ...savedFilters.map((savedFilter): AppCommand => ({
        id: `saved-filter-${savedFilter.id}`,
        title: `Saved Filter: ${savedFilter.name}`,
        group: 'Search',
        type: 'filter',
        icon: 'filter_alt',
        section: 'search',
        keywords: [trimLabel(savedFilter.name)],
        execute: () => {
          const loaded = loadSavedFilter(savedFilter.id);
          if (loaded?.filter) {
            clearTransientSearchState();
            setActiveFilter(loaded.filter);
            setIsAdvancedFilterOpen(true);
          }
        },
      })),
    ];

    searchCommands.forEach(cmd => registerCommand(cmd));

    return () => {
      searchCommands.forEach(cmd => unregisterCommand(cmd.id));
    };
  }, [
    registerCommand,
    unregisterCommand,
    savedSearches,
    searchHistory,
    setSearchQuery,
    loadSavedSearch,
    savedFilters,
    loadSavedFilter,
    setActiveFilter,
    setIsAdvancedFilterOpen,
  ]);

  useEffect(() => {
    const appCommands: AppCommand[] = applications.map((app) => ({
      id: `app-${app.id}`,
      title: `${app.universityName} • ${app.programName}`,
      subtitle: `${app.department} · ${app.status}`,
      group: 'Applications',
      type: 'entity',
      icon: 'school',
      section: 'views',
      keywords: [
        trimLabel(app.universityName),
        trimLabel(app.programName),
        trimLabel(app.department || ''),
        trimLabel(app.location || ''),
        ...(app.tags || []).map(tag => trimLabel(tag)),
      ],
      execute: () => openModal(app),
    }));

    appCommands.forEach(cmd => registerCommand(cmd));

    return () => {
      appCommands.forEach(cmd => unregisterCommand(cmd.id));
    };
  }, [
    applications,
    registerCommand,
    unregisterCommand,
    openModal,
  ]);
};
