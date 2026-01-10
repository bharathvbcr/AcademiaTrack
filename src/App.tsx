import React, { lazy, Suspense, useMemo, useEffect, useRef } from 'react';
import { useApplications } from './hooks/useApplications';
import { useAppModals } from './hooks/useAppModals';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEnhancedKeyboardShortcuts } from './hooks/useEnhancedKeyboardShortcuts';
import { useConfirmation } from './hooks/useConfirmation';
import { useBulkSelection } from './hooks/useBulkSelection';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useAdvancedFilter } from './hooks/useAdvancedFilter';
import { useTemplates } from './hooks/useTemplates';
import { useDarkMode } from './hooks/useDarkMode';
import { useLockBodyScroll } from './hooks/useLockBodyScroll';
import { useWorkflowAutomation } from './hooks/useWorkflowAutomation';
import { ProgramType, Application, FacultyContact, ApplicationStatus } from './types';
import { DropResult } from '@hello-pangea/dnd';
import { exportToCSV, parseCSV } from './utils';
import { downloadICS } from './utils/calendarExport';
import { downloadMarkdown, exportToPDF } from './utils/exportFormats';
import { ApplicationSearchIndex } from './utils/searchIndex';
import { EXPORT_FIELDS, getFieldValue } from './types/exportConfig';

import Header from './components/Header';
import TitleBar from './components/TitleBar';
import ConfirmationModal from './components/ConfirmationModal';
import MainContent from './components/MainContent';
import CommandPalette from './components/CommandPalette';
import BulkOperationsModal from './components/BulkOperationsModal';
import AdvancedFilterBuilder from './components/AdvancedFilterBuilder';
import SettingsModal from './components/SettingsModal';
import AdvancedSearchBar from './components/AdvancedSearchBar';

const ApplicationModal = lazy(() => import('./components/ApplicationModal'));
const FacultyContactModal = lazy(() => import('./components/FacultyContactModal'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const ComparisonModal = lazy(() => import('./components/ComparisonModal'));
const QuickCaptureModal = lazy(() => import('./components/QuickCaptureModal'));
const ExportConfigModal = lazy(() => import('./components/ExportConfigModal'));
const ImportConflictResolver = lazy(() => import('./components/ImportConflictResolver'));
const WorkflowRulesModal = lazy(() => import('./components/WorkflowRulesModal'));

const App: React.FC = () => {
  useDarkMode();
  const {
    applications,
    addApplication,
    updateApplication,
    deleteApplication,
    addFacultyContact,
    duplicateApplication,
    importApplications,
    mergeApplications,
    undo,
    redo,
    canUndo,
    canRedo,
    getChangedAppIds,
  } = useApplications();

  const { processRules } = useWorkflowAutomation();
  
  // Track previous application states for workflow triggers
  const previousAppsRef = useRef<Map<string, Application>>(new Map());

  const {
    isModalOpen,
    isFacultyModalOpen,
    editingApplication,
    openModal,
    closeModal,
    openFacultyModal,
    closeFacultyModal,
  } = useAppModals();

  const [isComparisonOpen, setIsComparisonOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [isBulkOperationsOpen, setIsBulkOperationsOpen] = React.useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = React.useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = React.useState<Application[]>([]);
  const [exportConfigOpen, setExportConfigOpen] = React.useState(false);
  const [pendingExportFormat, setPendingExportFormat] = React.useState<'csv' | 'json' | 'ics' | 'md' | 'pdf' | null>(null);
  const [importConflicts, setImportConflicts] = React.useState<Array<{ existing: Application; imported: Application; matchKey: string }>>([]);
  const [isConflictResolverOpen, setIsConflictResolverOpen] = React.useState(false);
  const [pendingImportData, setPendingImportData] = React.useState<Application[]>([]);
  const [isWorkflowRulesOpen, setIsWorkflowRulesOpen] = React.useState(false);

  // Lock scroll when advanced filter (inline modal) is open
  useLockBodyScroll(isAdvancedFilterOpen);

  // Advanced Filtering
  const {
    activeFilter,
    setActiveFilter,
    filteredApplications: advancedFilteredApplications,
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    clearFilter,
  } = useAdvancedFilter(applications);

  // Use advanced filter if active, otherwise use basic filter
  const applicationsToFilter = activeFilter ? advancedFilteredApplications : applications;

  // Use advanced search results if available, otherwise use all applications
  const applicationsForFilter = advancedSearchResults.length > 0 && advancedSearchResults.length < applications.length
    ? advancedSearchResults
    : applicationsToFilter;

  const {
    searchQuery,
    setSearchQuery,
    sortConfig,
    requestSort,
    filteredAndSortedApplications,
  } = useSortAndFilter(applicationsForFilter);

  // Search Index
  const searchIndexRef = useRef(new ApplicationSearchIndex());
  const indexUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced search with index
  const finalFilteredApplications = useMemo(() => {
    if (searchQuery.trim() && searchQuery.length >= 2) {
      const indexedResults = searchIndexRef.current.search(searchQuery);
      // Merge with current filter results
      const indexedIds = new Set(indexedResults.map(app => app.id));
      return filteredAndSortedApplications.filter(app => indexedIds.has(app.id));
    }
    return filteredAndSortedApplications;
  }, [filteredAndSortedApplications, searchQuery]);

  const [defaultProgramType, setDefaultProgramType] = useLocalStorage<ProgramType>('default-program-type', ProgramType.PhD);
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline'>('view-mode', 'list');

  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();

  // Command Palette
  const commandPalette = useCommandPalette();

  // Templates
  const { templates, useTemplate, createFromApplication } = useTemplates();

  // Initial index build on mount
  useEffect(() => {
    if (applications.length > 0) {
      searchIndexRef.current.rebuild(applications);
    }
  }, []); // Only on mount

  // Initialize previousAppsRef with current application states
  useEffect(() => {
    applications.forEach(app => {
      if (!previousAppsRef.current.has(app.id)) {
        previousAppsRef.current.set(app.id, app);
      }
    });
  }, [applications]);

  // Expose global function to open workflow rules modal
  useEffect(() => {
    (window as any).openWorkflowRules = () => setIsWorkflowRulesOpen(true);
    return () => {
      delete (window as any).openWorkflowRules;
    };
  }, []);

  // Incremental index updates for changed applications
  useEffect(() => {
    // Clear any pending update
    if (indexUpdateTimeoutRef.current) {
      clearTimeout(indexUpdateTimeoutRef.current);
    }

    // Debounce index updates (batch multiple changes)
    indexUpdateTimeoutRef.current = setTimeout(() => {
      const { changed, deleted } = getChangedAppIds();
      
      // Handle deleted applications
      deleted.forEach(id => {
        searchIndexRef.current.removeApplication(id);
      });

      // Handle changed/new applications
      changed.forEach(id => {
        const app = applications.find(a => a.id === id);
        if (app) {
          searchIndexRef.current.indexApplication(app);
        }
      });
    }, 500); // 500ms debounce

    return () => {
      if (indexUpdateTimeoutRef.current) {
        clearTimeout(indexUpdateTimeoutRef.current);
      }
    };
  }, [applications, getChangedAppIds]);

  // Bulk selection
  const {
    selectedIds,
    isSelectionMode,
    selectedCount,
    toggleSelectionMode,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    getSelectedApplications,
    focusedIndex,
  } = useBulkSelection(filteredAndSortedApplications);

  const requestDelete = React.useCallback((id: string) => {
    showConfirmation(
      'Delete Application',
      'Are you sure you want to delete this application? This action cannot be undone.',
      () => deleteApplication(id),
      true
    );
  }, [showConfirmation, deleteApplication]);

  // Bulk action handlers
  const handleBulkStatusChange = React.useCallback((status: ApplicationStatus) => {
    const selectedApps = getSelectedApplications();
    selectedApps.forEach(app => {
      const previousApp = previousAppsRef.current.get(app.id) || app;
      const updatedApp = { ...app, status };
      updateApplication(updatedApp);
      // Process workflow rules
      setTimeout(() => {
        processRules(updatedApp, previousApp, (currentApp, ruleUpdates) => {
          updateApplication({ ...currentApp, ...ruleUpdates });
        });
      }, 0);
      previousAppsRef.current.set(app.id, updatedApp);
    });
    clearSelection();
    toggleSelectionMode();
  }, [getSelectedApplications, updateApplication, clearSelection, toggleSelectionMode, processRules]);

  const handleBulkDelete = React.useCallback(() => {
    showConfirmation(
      'Delete Selected Applications',
      `Are you sure you want to delete ${selectedCount} application(s)? This action cannot be undone.`,
      () => {
        const selectedApps = getSelectedApplications();
        selectedApps.forEach(app => {
          deleteApplication(app.id);
        });
        clearSelection();
        toggleSelectionMode();
      },
      true
    );
  }, [showConfirmation, selectedCount, getSelectedApplications, deleteApplication, clearSelection, toggleSelectionMode]);

  const handleBulkCompare = React.useCallback(() => {
    if (selectedCount < 2) return;
    setIsComparisonOpen(true);
  }, [selectedCount]);

  useKeyboardShortcuts({
    'Ctrl+z': () => {
      if (canUndo) {
        undo();
        if (window.electron) window.electron.showNotification('Undo', 'Action undone');
      }
    },
    'Ctrl+y': () => {
      if (canRedo) {
        redo();
        if (window.electron) window.electron.showNotification('Redo', 'Action redone');
      }
    },
    'Ctrl+Shift+Z': () => {
      if (canRedo) {
        redo();
        if (window.electron) window.electron.showNotification('Redo', 'Action redone');
      }
    },
    'Ctrl+n': () => openModal(null),
    'Ctrl+1': () => setViewMode('list'),
    'Ctrl+2': () => setViewMode('kanban'),
    'Ctrl+3': () => setViewMode('calendar'),
    'Ctrl+4': () => setViewMode('budget'),
    'Ctrl+5': () => setViewMode('faculty'),
    'Ctrl+6': () => setViewMode('recommenders'),
    'Ctrl+7': () => setViewMode('timeline'),
    'Escape': () => {
      if (isSelectionMode) {
        toggleSelectionMode();
      }
    },
  });

  // Enhanced shortcuts for new features
  useEnhancedKeyboardShortcuts({
    'quick-capture': () => setIsQuickCaptureOpen(true),
    'toggle-theme': () => {
      // Toggle theme logic if needed, but useDarkMode handles it? 
      // useDarkMode currently forces dark.
      // If we want a toggle, we'd need to update useDarkMode to expose a toggle function.
      // For now, implementing quick capture.
    }
  });

  const handleSave = React.useCallback((app: Application) => {
    try {
      if (editingApplication) {
        const previousApp = previousAppsRef.current.get(app.id);
        updateApplication(app);
        // Process workflow rules after update
        setTimeout(() => {
          processRules(app, previousApp, (currentApp, updates) => {
            updateApplication({ ...currentApp, ...updates });
          });
        }, 0);
        previousAppsRef.current.set(app.id, app);
      } else {
        addApplication(app);
        // Process workflow rules for new application
        setTimeout(() => {
          processRules(app, undefined, (currentApp, updates) => {
            updateApplication({ ...currentApp, ...updates });
          });
        }, 0);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save application:', error);
      if (window.electron) {
        window.electron.showNotification('Error', 'Failed to save application. Please try again.');
      }
    }
  }, [editingApplication, updateApplication, addApplication, closeModal, processRules]);

  const handleSaveFacultyContact = (contact: FacultyContact, universityName: string, isNewUniversity: boolean) => {
    try {
      addFacultyContact(contact, universityName, isNewUniversity, defaultProgramType);
      closeFacultyModal();
    } catch (error) {
      console.error('Failed to save faculty contact:', error);
      if (window.electron) {
        window.electron.showNotification('Error', 'Failed to save faculty contact. Please try again.');
      }
    }
  };

  const handleExport = (format: 'csv' | 'json' | 'ics' | 'md' | 'pdf') => {
    // Show export config modal for CSV, JSON, MD, PDF (ICS doesn't need field selection)
    if (format === 'ics') {
      const appsToExport = isSelectionMode && selectedCount > 0
        ? getSelectedApplications()
        : applications;
      downloadICS(appsToExport);
    } else {
      setPendingExportFormat(format);
      setExportConfigOpen(true);
    }
  };

  const handleExportWithConfig = (config: { selectedFields: string[]; includeHeaders: boolean }) => {
    if (!pendingExportFormat) return;

    const appsToExport = isSelectionMode && selectedCount > 0
      ? getSelectedApplications()
      : applications;

    // Import export utilities
    import('./utils/exportFormatsWithConfig').then(({ exportToCSVWithConfig, exportToMarkdownWithConfig, exportToPDFWithConfig }) => {
      if (pendingExportFormat === 'csv') {
        exportToCSVWithConfig(appsToExport, config);
      } else if (pendingExportFormat === 'md') {
        exportToMarkdownWithConfig(appsToExport, config);
      } else if (pendingExportFormat === 'pdf') {
        exportToPDFWithConfig(appsToExport, config);
      } else if (pendingExportFormat === 'json') {
        // For JSON, filter the application objects
        const filtered = appsToExport.map(app => {
          const filteredApp: any = {};
          config.selectedFields.forEach(fieldId => {
            const field = EXPORT_FIELDS.find(f => f.id === fieldId);
            if (field) {
              const value = getFieldValue(app, field.path);
              filteredApp[field.label] = field.formatter ? field.formatter(value) : value;
            }
          });
          return filteredApp;
        });
        const dataStr = JSON.stringify(filtered, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `applications-${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    });

    setExportConfigOpen(false);
    setPendingExportFormat(null);
  };

  const handleBulkUpdate = React.useCallback((updates: Partial<Application> | ((app: Application) => Partial<Application>), ids: string[]) => {
    ids.forEach(id => {
      const app = applications.find(a => a.id === id);
      if (app) {
        const previousApp = previousAppsRef.current.get(app.id) || app;
        const appUpdates = typeof updates === 'function' ? updates(app) : updates;

        // Handle tag removal
        if (appUpdates.tags) {
          const removeTags = appUpdates.tags.filter(t => t.startsWith('__remove__'));
          const addTags = appUpdates.tags.filter(t => !t.startsWith('__remove__'));
          const currentTags = app.tags || [];
          const tagsToRemove = removeTags.map(t => t.replace('__remove__', ''));
          const newTags = [
            ...currentTags.filter(t => !tagsToRemove.includes(t)),
            ...addTags.filter(t => !currentTags.includes(t)),
          ];
          appUpdates.tags = newTags;
        }
        const updatedApp = { ...app, ...appUpdates };
        updateApplication(updatedApp);
        // Process workflow rules
        setTimeout(() => {
          processRules(updatedApp, previousApp, (currentApp, ruleUpdates) => {
            updateApplication({ ...currentApp, ...ruleUpdates });
          });
        }, 0);
        previousAppsRef.current.set(app.id, updatedApp);
      }
    });
    clearSelection();
    setIsBulkOperationsOpen(false);
  }, [applications, updateApplication, clearSelection, processRules]);

  const handleCommandPaletteAction = React.useCallback((action: string, ...args: any[]) => {
    switch (action) {
      case 'new':
        openModal(null);
        break;
      case 'import':
        document.getElementById('file-input')?.click();
        break;
      case 'export-csv':
        handleExport('csv');
        break;
      case 'export-json':
        handleExport('json');
        break;

      case 'export-ics':
        handleExport('ics');
        break;
      case 'settings':
        setSettingsOpen(true);
        break;
      case 'bulk-status':
        setIsBulkOperationsOpen(true);
        break;
      default:
        if (action.startsWith('view-')) {
          const view = action.replace('view-', '') as any;
          setViewMode(view);
        } else if (action.startsWith('filter-')) {
          const filterQuery = action.replace('filter-', '');
          if (filterQuery === 'due:week') {
            // Apply week filter
          } else if (filterQuery.startsWith('status:')) {
            const status = filterQuery.replace('status:', '') as ApplicationStatus;
            // Apply status filter
          }
        } else if (action.startsWith('app-')) {
          const appId = action.replace('app-', '');
          const app = applications.find(a => a.id === appId);
          if (app) openModal(app);
        }
    }
  }, [openModal, handleExport, setViewMode, applications]);

  const detectConflicts = (existing: Application[], imported: Application[]): Array<{ existing: Application; imported: Application; matchKey: string }> => {
    const conflicts: Array<{ existing: Application; imported: Application; matchKey: string }> = [];
    
    imported.forEach(importedApp => {
      // Match on universityName + programName + admissionYear
      const match = existing.find(existingApp => {
        const universityMatch = existingApp.universityName.toLowerCase() === importedApp.universityName?.toLowerCase();
        const programMatch = existingApp.programName.toLowerCase() === importedApp.programName?.toLowerCase();
        const yearMatch = !existingApp.admissionYear || !importedApp.admissionYear || 
                         existingApp.admissionYear === importedApp.admissionYear;
        return universityMatch && programMatch && yearMatch;
      });

      if (match) {
        conflicts.push({
          existing: match,
          imported: importedApp,
          matchKey: `${importedApp.universityName} - ${importedApp.programName}${importedApp.admissionYear ? ` (${importedApp.admissionYear})` : ''}`,
        });
      }
    });

    return conflicts;
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        let json: any;

        if (file.name.toLowerCase().endsWith('.csv')) {
          json = parseCSV(result);
        } else {
          json = JSON.parse(result);
        }

        // Basic validation
        const isValid = Array.isArray(json) && json.every(item =>
          item &&
          typeof item === 'object' &&
          ('universityName' in item || 'university' in item) // Loose validation for CSV
        );

        if (isValid) {
          const importedApps = json as Application[];
          
          if (file.name.toLowerCase().endsWith('.csv')) {
            // For CSV, check for conflicts but allow merge
            const conflicts = detectConflicts(applications, importedApps);
            if (conflicts.length > 0) {
              setImportConflicts(conflicts);
              setPendingImportData(importedApps);
              setIsConflictResolverOpen(true);
            } else {
              showConfirmation(
                'Import CSV Data',
                `Found ${importedApps.length} applications. This will ADD them to your current list. Proceed?`,
                () => mergeApplications(importedApps),
                false
              );
            }
          } else {
            // For JSON, check for conflicts
            const conflicts = detectConflicts(applications, importedApps);
            if (conflicts.length > 0) {
              setImportConflicts(conflicts);
              setPendingImportData(importedApps);
              setIsConflictResolverOpen(true);
            } else {
              showConfirmation(
                'Import JSON Data',
                'This will OVERWRITE your current data. Are you sure you want to proceed?',
                () => importApplications(importedApps),
                true
              );
            }
          }
        } else {
          if (window.electron) window.electron.showNotification('Error', 'Invalid JSON format. The file does not contain valid application data.');
          else console.error('Invalid JSON format');
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        if (window.electron) window.electron.showNotification('Error', 'Error parsing JSON file.');
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleConflictResolution = (resolutions: Map<string, 'keep' | 'overwrite' | 'merge' | 'skip'>) => {
    const conflictsToResolve = importConflicts;
    const newApps: Application[] = [];
    const appsToUpdate: Application[] = [];
    const appsToSkip = new Set<string>();

    // Process conflicts
    conflictsToResolve.forEach(conflict => {
      const resolution = resolutions.get(conflict.existing.id);
      if (resolution === 'skip') {
        appsToSkip.add(conflict.imported.id || conflict.existing.id);
      } else if (resolution === 'overwrite') {
        appsToUpdate.push({ ...conflict.imported, id: conflict.existing.id });
      } else if (resolution === 'merge') {
        // Merge: keep existing, update with non-null imported values
        const merged: Application = { ...conflict.existing };
        Object.keys(conflict.imported).forEach(key => {
          const importedValue = (conflict.imported as any)[key];
          if (importedValue !== null && importedValue !== undefined && importedValue !== '') {
            (merged as any)[key] = importedValue;
          }
        });
        appsToUpdate.push(merged);
      }
      // 'keep' means do nothing - existing stays as is
    });

    // Process non-conflicting imported apps
    const conflictingIds = new Set(conflictsToResolve.map(c => c.imported.id || c.existing.id));
    pendingImportData.forEach(importedApp => {
      if (!conflictingIds.has(importedApp.id || '') && !appsToSkip.has(importedApp.id || '')) {
        newApps.push(importedApp);
      }
    });

    // Apply updates
    appsToUpdate.forEach(app => {
      updateApplication(app);
    });

    // Add new apps
    if (newApps.length > 0) {
      mergeApplications(newApps);
    }

    setIsConflictResolverOpen(false);
    setImportConflicts([]);
    setPendingImportData([]);
    
    if (window.electron) {
      window.electron.showNotification(
        'Import Complete',
        `Updated ${appsToUpdate.length} applications, added ${newApps.length} new applications`
      );
    }
  };

  const handleDragEnd = React.useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const app = applications.find(a => a.id === draggableId);
    if (app) {
      updateApplication({
        ...app,
        status: destination.droppableId as any
      });
    }
  }, [applications, updateApplication]);

  // Check if running in Electron (titlebar will be shown)
  const isElectron = !!window.electron?.windowControls;

  return (
    <>
      <TitleBar />
      <div className={`min-h-screen text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8 ${isElectron ? 'pt-12' : ''}`}>
        <div className="max-w-7xl mx-auto">
        <Header
          onAddNew={() => openModal(null)}
          onAddFaculty={openFacultyModal}
          defaultProgramType={defaultProgramType}
          onSetDefaultProgramType={setDefaultProgramType}
          onExport={handleExport}
          onImport={handleImport}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onShowHelp={() => setIsHelpOpen(true)}
        />

        {/* Advanced Search Bar */}
        <div className="mb-6">
          <AdvancedSearchBar
            applications={applications}
            onSearch={setAdvancedSearchResults}
          />
        </div>

        <MainContent
          viewMode={viewMode}
          applications={applications}
          filteredAndSortedApplications={finalFilteredApplications}
          sortConfig={sortConfig}
          requestSort={requestSort}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openModal={openModal}
          requestDelete={requestDelete}
          updateApplication={updateApplication}
          duplicateApplication={duplicateApplication}
          handleDragEnd={handleDragEnd}
          // Bulk selection props
          isSelectionMode={isSelectionMode}
          selectedIds={selectedIds}
          selectedCount={selectedCount}
          toggleSelectionMode={toggleSelectionMode}
          toggleSelection={toggleSelection}
          selectAll={selectAll}
          clearSelection={clearSelection}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkDelete={handleBulkDelete}
          onBulkCompare={handleBulkCompare}
          selectRange={selectRange}
          focusedIndex={focusedIndex}
        />


      </div>

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        isDanger={confirmation.isDanger}
      />

      <Suspense fallback={<div>Loading...</div>}>
        <ApplicationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSave}
          applicationToEdit={editingApplication || undefined}
          onDuplicate={(app) => {
            duplicateApplication(app.id);
            closeModal();
          }}
        />
        <FacultyContactModal
          isOpen={isFacultyModalOpen}
          onClose={closeFacultyModal}
          onSave={handleSaveFacultyContact}
          applications={applications}
        />
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
        <ComparisonModal
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          applications={getSelectedApplications()}
        />
      </Suspense>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        applications={applications}
        onNewApplication={() => openModal(null)}
        onViewChange={setViewMode}
        onOpenApplication={(id) => {
          const app = applications.find(a => a.id === id);
          if (app) openModal(app);
        }}
        onBulkAction={(action) => {
          if (action === 'status') setIsBulkOperationsOpen(true);
        }}
        onFilter={(query) => {
          setSearchQuery(query);
        }}
        onExport={handleExport}
        onImport={() => document.getElementById('file-input')?.click()}
        onSettings={() => setSettingsOpen(true)}
      />

      {/* Bulk Operations Modal */}
      {isBulkOperationsOpen && (
        <BulkOperationsModal
          isOpen={isBulkOperationsOpen}
          onClose={() => setIsBulkOperationsOpen(false)}
          selectedApplications={getSelectedApplications()}
          onUpdate={handleBulkUpdate}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Workflow Rules Modal */}
      {isWorkflowRulesOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <WorkflowRulesModal
            isOpen={isWorkflowRulesOpen}
            onClose={() => setIsWorkflowRulesOpen(false)}
          />
        </Suspense>
      )}

      {/* Export Config Modal */}
      {exportConfigOpen && pendingExportFormat && (
        <Suspense fallback={<div>Loading...</div>}>
          <ExportConfigModal
            isOpen={exportConfigOpen}
            onClose={() => {
              setExportConfigOpen(false);
              setPendingExportFormat(null);
            }}
            onExport={handleExportWithConfig}
            format={pendingExportFormat}
          />
        </Suspense>
      )}

      {/* Import Conflict Resolver */}
      {isConflictResolverOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <ImportConflictResolver
            isOpen={isConflictResolverOpen}
            onClose={() => {
              setIsConflictResolverOpen(false);
              setImportConflicts([]);
              setPendingImportData([]);
            }}
            conflicts={importConflicts}
            onResolve={handleConflictResolution}
          />
        </Suspense>
      )}

      {isQuickCaptureOpen && (
        <QuickCaptureModal
          isOpen={isQuickCaptureOpen}
          onClose={() => setIsQuickCaptureOpen(false)}
          onSave={(app) => {
            addApplication(app);
            if (window.electron) window.electron.showNotification('Success', 'Application captured!');
          }}
        />
      )}



      {/* Advanced Filter Builder */}
      {isAdvancedFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Advanced Filter Builder</h2>
              <button
                onClick={() => setIsAdvancedFilterOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <AdvancedFilterBuilder
              filter={activeFilter}
              onFilterChange={setActiveFilter}
              onSave={(name, filter) => saveFilter(name, filter)}
              savedFilters={savedFilters}
              onLoadFilter={(id) => loadFilter(id)}
              onDeleteFilter={(id) => deleteFilter(id)}
            />
            {activeFilter && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={clearFilter}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Clear Filter
                </button>
                <button
                  onClick={() => setIsAdvancedFilterOpen(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Apply Filter
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default App;