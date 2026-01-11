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
import { useAutomation } from './hooks/useAutomation';
import { useViewState } from './hooks/useViewState';
import { useToast } from './hooks/useToast';
import { ProgramType, Application, FacultyContact, ApplicationStatus } from './types';
import { DropResult } from '@hello-pangea/dnd';
import { exportToCSV, parseCSV } from './utils';
import { ApplicationSearchIndexWrapper } from './utils/searchIndexWrapper';

import Header from './components/Header';
import TitleBar from './components/TitleBar';
import ConfirmationModal from './components/ConfirmationModal';
import MainContent from './components/MainContent';
import CommandPalette from './components/CommandPalette';
import BulkOperationsModal from './components/BulkOperationsModal';
import AdvancedFilterBuilder from './components/AdvancedFilterBuilder';
import SettingsModal from './components/SettingsModal';
import { ToastContainer } from './components/Toast';

const ApplicationModal = lazy(() => import('./components/ApplicationModal'));
const FacultyContactModal = lazy(() => import('./components/FacultyContactModal'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const ComparisonModal = lazy(() => import('./components/ComparisonModal'));
const QuickCaptureModal = lazy(() => import('./components/QuickCaptureModal'));
const ExportConfigModal = lazy(() => import('./components/ExportConfigModal'));
const KanbanConfigModal = lazy(() => import('./components/KanbanConfigModal'));
const ViewPresetModal = lazy(() => import('./components/ViewPresetModal'));
const AutomationRulesModal = lazy(() => import('./components/AutomationRulesModal'));

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
  } = useApplications();

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
  const [quickCaptureText, setQuickCaptureText] = React.useState<string>('');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = React.useState<Application[]>([]);
  const [isExportConfigOpen, setIsExportConfigOpen] = React.useState(false);
  const [isKanbanConfigOpen, setIsKanbanConfigOpen] = React.useState(false);
  const [isViewPresetOpen, setIsViewPresetOpen] = React.useState(false);
  const [isAutomationRulesOpen, setIsAutomationRulesOpen] = React.useState(false);

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

  // Search Index (using Web Worker when available)
  const searchIndexRef = useRef(new ApplicationSearchIndexWrapper());
  const [searchResults, setSearchResults] = React.useState<Application[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Enhanced search with index (async with worker)
  useEffect(() => {
    if (searchQuery.trim() && searchQuery.length >= 2) {
      setIsSearching(true);
      searchIndexRef.current.search(searchQuery).then((results) => {
        setSearchResults(results);
        setIsSearching(false);
      }).catch((error) => {
        console.error('Search error:', error);
        setIsSearching(false);
        setSearchResults([]);
      });
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const finalFilteredApplications = useMemo(() => {
    if (searchQuery.trim() && searchQuery.length >= 2 && searchResults.length > 0) {
      // Merge with current filter results
      const indexedIds = new Set(searchResults.map(app => app.id));
      return filteredAndSortedApplications.filter(app => indexedIds.has(app.id));
    }
    return filteredAndSortedApplications;
  }, [filteredAndSortedApplications, searchQuery, searchResults]);

  const [defaultProgramType, setDefaultProgramType] = useLocalStorage<ProgramType>('default-program-type', ProgramType.PhD);
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline'>('view-mode', 'list');

  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();

  // Command Palette
  const commandPalette = useCommandPalette();

  // Templates
  const { templates, useTemplate, createFromApplication } = useTemplates();

  // Incremental index updates - only update changed applications (async with worker)
  useEffect(() => {
    // Use incremental update instead of full rebuild for better performance
    searchIndexRef.current.updateApplications(applications).catch((error) => {
      console.error('Index update error:', error);
    });
  }, [applications]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      searchIndexRef.current.destroy();
    };
  }, []);

  // Bulk selection
  const {
    selectedIds,
    isSelectionMode,
    selectedCount,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedApplications,
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
      updateApplication({ ...app, status });
    });
    clearSelection();
    toggleSelectionMode();
  }, [getSelectedApplications, updateApplication, clearSelection, toggleSelectionMode]);

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
        showToast('info', 'Action undone', 'Undo');
      }
    },
    'Ctrl+y': () => {
      if (canRedo) {
        redo();
        showToast('info', 'Action redone', 'Redo');
      }
    },
    'Ctrl+Shift+Z': () => {
      if (canRedo) {
        redo();
        showToast('info', 'Action redone', 'Redo');
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

  // Automation
  const { executeRules } = useAutomation();

  // View state
  const viewState = useViewState(viewMode);

  // Toast notifications
  const { toasts, showToast, removeToast } = useToast();

  const handleSave = React.useCallback((app: Application) => {
    try {
      const wasNew = !editingApplication;
      let updatedApp = app;
      
      if (editingApplication) {
        updateApplication(app);
        updatedApp = app;
        // Execute automation rules for field updates
        const updates = executeRules(updatedApp, 'field_updated', { field: 'any' });
        if (updates) {
          updateApplication({ ...updatedApp, ...updates });
        }
      } else {
        addApplication(app);
        updatedApp = app;
        // Execute automation rules for new applications
        const updates = executeRules(updatedApp, 'application_created');
        if (updates) {
          updateApplication({ ...updatedApp, ...updates });
        }
      }
      closeModal();
      showToast('success', 'Application saved successfully');
    } catch (error) {
      console.error('Failed to save application:', error);
      showToast('error', 'Failed to save application. Please try again.', 'Error');
    }
  }, [editingApplication, updateApplication, addApplication, closeModal, executeRules]);

  const handleSaveFacultyContact = (contact: FacultyContact, universityName: string, isNewUniversity: boolean) => {
    try {
      addFacultyContact(contact, universityName, isNewUniversity, defaultProgramType);
      closeFacultyModal();
      showToast('success', 'Faculty contact saved successfully');
    } catch (error) {
      console.error('Failed to save faculty contact:', error);
      showToast('error', 'Failed to save faculty contact. Please try again.', 'Error');
    }
  };

  const handleExportWithConfig = React.useCallback(() => {
    setIsExportConfigOpen(true);
  }, []);

  const handleQuickCapture = React.useCallback((text: string) => {
    // Store the text and open quick capture modal - it will handle parsing
    setQuickCaptureText(text);
    setIsQuickCaptureOpen(true);
  }, []);

  const handleExport = async (format: 'csv' | 'json' | 'ics' | 'md' | 'pdf', selectedFields?: string[]) => {
    const appsToExport = isSelectionMode && selectedCount > 0
      ? getSelectedApplications()
      : applications;

    if (format === 'csv') {
      exportToCSV(appsToExport, selectedFields);
    } else if (format === 'ics') {
      const { downloadICS } = await import('./utils/calendarExport');
      downloadICS(appsToExport);
    } else if (format === 'md') {
      const { downloadMarkdown } = await import('./utils/exportFormats');
      downloadMarkdown(appsToExport, selectedFields);
    } else if (format === 'pdf') {
      const { exportToPDF } = await import('./utils/exportFormats');
      exportToPDF(appsToExport, selectedFields);
    } else {
      const dataStr = JSON.stringify(appsToExport, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `applications-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const handleBulkUpdate = React.useCallback((updates: Partial<Application> | ((app: Application) => Partial<Application>), ids: string[]) => {
    ids.forEach(id => {
      const app = applications.find(a => a.id === id);
      if (app) {
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
        updateApplication({ ...app, ...appUpdates });
      }
    });
    clearSelection();
    setIsBulkOperationsOpen(false);
  }, [applications, updateApplication, clearSelection]);

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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('error', `File is too large. Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`, 'Import Error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        if (!result || result.trim().length === 0) {
          throw new Error('File is empty');
        }

        let json: any;

        if (file.name.toLowerCase().endsWith('.csv')) {
          json = parseCSV(result);
        } else {
          json = JSON.parse(result);
        }

        // Enhanced validation
        if (!Array.isArray(json)) {
          throw new Error('File must contain an array of applications');
        }

        if (json.length === 0) {
          throw new Error('File contains no applications');
        }

        // Validate each application
        const validationErrors: string[] = [];
        const validApplications = json.filter((item: any, index: number) => {
          if (!item || typeof item !== 'object') {
            validationErrors.push(`Item ${index + 1}: Not a valid object`);
            return false;
          }
          if (!('universityName' in item || 'university' in item)) {
            validationErrors.push(`Item ${index + 1}: Missing university name`);
            return false;
          }
          if (!('programName' in item || 'program' in item)) {
            validationErrors.push(`Item ${index + 1}: Missing program name`);
            return false;
          }
          return true;
        });

        if (validApplications.length === 0) {
          throw new Error(`No valid applications found. Errors: ${validationErrors.slice(0, 3).join('; ')}`);
        }

        if (validationErrors.length > 0 && validApplications.length < json.length) {
          showToast('warning', `${validationErrors.length} invalid application(s) were skipped. ${validApplications.length} valid application(s) will be imported.`, 'Import Warning', 8000);
        }

        if (file.name.toLowerCase().endsWith('.csv')) {
          showConfirmation(
            'Import CSV Data',
            `Found ${validApplications.length} valid application(s). This will ADD them to your current list. Proceed?`,
            () => {
              try {
                mergeApplications(validApplications);
                showToast('success', `Successfully imported ${validApplications.length} application(s)`, 'Import Success');
              } catch (error) {
                showToast('error', error instanceof Error ? error.message : 'Failed to import applications', 'Import Error');
              }
            },
            false // Not dangerous
          );
        } else {
          showConfirmation(
            'Import JSON Data',
            `Found ${validApplications.length} valid application(s). This will OVERWRITE your current data. Are you sure you want to proceed?`,
            () => {
              try {
                importApplications(validApplications);
                showToast('success', `Successfully imported ${validApplications.length} application(s)`, 'Import Success');
              } catch (error) {
                showToast('error', error instanceof Error ? error.message : 'Failed to import applications', 'Import Error');
              }
            },
            true // Dangerous
          );
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        showToast('error', `Error importing file: ${errorMessage}`, 'Import Error');
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    };

    reader.onerror = () => {
      showToast('error', 'Failed to read file. Please try again.', 'Import Error');
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleDragEnd = React.useCallback((result: DropResult) => {
    if (!result.destination) return;

    const app = applications.find(a => a.id === result.draggableId);
    if (!app) return;

    const newStatus = result.destination.droppableId as ApplicationStatus;
    if (app.status === newStatus) return;

    const updatedApp = { ...app, status: newStatus };
    updateApplication(updatedApp);

    // Execute automation rules for status change
    const updates = executeRules(updatedApp, 'status_changed', { newStatus, oldStatus: app.status });
    if (updates) {
      updateApplication({ ...updatedApp, ...updates });
    }
  }, [applications, updateApplication, executeRules]);

  // Check if running in Electron (titlebar will be shown)
  const isElectron = !!window.electron?.windowControls;

  return (
    <>
      <TitleBar />
      <div className={`min-h-screen text-[#F5D7DA] font-sans p-4 sm:p-6 lg:p-8 ${isElectron ? 'pt-16' : ''} relative z-10`}>
        <div className="max-w-7xl mx-auto">
        <Header
          onAddNew={() => openModal(null)}
          onAddFaculty={openFacultyModal}
          defaultProgramType={defaultProgramType}
          onSetDefaultProgramType={setDefaultProgramType}
          onExport={handleExportWithConfig}
          onImport={handleImport}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onShowHelp={() => setIsHelpOpen(true)}
          onQuickCapture={handleQuickCapture}
          applications={applications}
          onSearch={setAdvancedSearchResults}
        />

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
          onOpenKanbanConfig={() => setIsKanbanConfigOpen(true)}
          onOpenAutomationRules={() => setIsAutomationRulesOpen(true)}
          onOpenViewPresets={() => setIsViewPresetOpen(true)}
        />
      )}

      {isQuickCaptureOpen && (
        <QuickCaptureModal
          isOpen={isQuickCaptureOpen}
          onClose={() => {
            setIsQuickCaptureOpen(false);
            setQuickCaptureText('');
          }}
          onSave={(app) => {
            addApplication(app);
            setQuickCaptureText('');
            // Execute automation rules for new applications
            const updates = executeRules(app, 'application_created');
            if (updates) {
              updateApplication({ ...app, ...updates });
            }
            showToast('success', 'Application captured successfully!', 'Quick Capture');
          }}
          initialText={quickCaptureText}
        />
      )}

      {/* Export Config Modal */}
      {isExportConfigOpen && (
        <ExportConfigModal
          isOpen={isExportConfigOpen}
          onClose={() => setIsExportConfigOpen(false)}
          applications={selectedCount > 0 ? getSelectedApplications() : finalFilteredApplications}
          onExport={(format, selectedFields) => {
            // Map 'markdown' to 'md' format
            const mappedFormat = format === 'markdown' ? 'md' : format;
            handleExport(mappedFormat as 'csv' | 'json' | 'ics' | 'md' | 'pdf', selectedFields);
            setIsExportConfigOpen(false);
          }}
        />
      )}

      {/* Kanban Config Modal */}
      {isKanbanConfigOpen && (
        <KanbanConfigModal
          isOpen={isKanbanConfigOpen}
          onClose={() => setIsKanbanConfigOpen(false)}
        />
      )}

      {/* View Preset Modal */}
      {isViewPresetOpen && (
        <ViewPresetModal
          isOpen={isViewPresetOpen}
          onClose={() => setIsViewPresetOpen(false)}
          viewMode={viewMode}
          currentState={{
            sortConfig,
            filters: {},
            searchQuery,
            columnWidths: viewState.getViewState()?.columnWidths,
            visibleColumns: viewState.getViewState()?.visibleColumns,
            columnOrder: viewState.getViewState()?.columnOrder,
          }}
        />
      )}

      {/* Automation Rules Modal */}
      {isAutomationRulesOpen && (
        <AutomationRulesModal
          isOpen={isAutomationRulesOpen}
          onClose={() => setIsAutomationRulesOpen(false)}
        />
      )}



      {/* Advanced Filter Builder */}
      {isAdvancedFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center liquid-glass-modal">
          <div className="liquid-glass-modal-content rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#F5D7DA]">Advanced Filter Builder</h2>
              <button
                onClick={() => setIsAdvancedFilterOpen(false)}
                className="p-2 hover:bg-[rgba(220,20,60,0.2)] rounded-lg text-[#E8B4B8]"
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
                  className="px-4 py-2 border border-[#E8B4B8]/30 rounded-lg hover:bg-[rgba(220,20,60,0.2)] text-[#F5D7DA]"
                >
                  Clear Filter
                </button>
                <button
                  onClick={() => setIsAdvancedFilterOpen(false)}
                  className="px-4 py-2 bg-gradient-to-br from-[#DC143C] to-[#FF2400] text-white rounded-lg hover:from-[#FF2400] hover:to-[#DC143C]"
                >
                  Apply Filter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </>
  );
};

export default App;