import React, { lazy, Suspense, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApplications } from './hooks/useApplications';
import { useAppModals } from './hooks/useAppModals';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useConfirmation } from './hooks/useConfirmation';
import { useBulkSelection } from './hooks/useBulkSelection';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useAdvancedFilter } from './hooks/useAdvancedFilter';
import { useAdvancedSearch } from './hooks/useAdvancedSearch';
import { useDarkMode } from './hooks/useDarkMode';
import { useLockBodyScroll } from './hooks/useLockBodyScroll';
import { useEscapeKey } from './hooks/useEscapeKey';
import { useAutomation } from './hooks/useAutomation';
import { useViewState, ViewMode } from './hooks/useViewState';
import { useToast } from './hooks/useToast';
import { useEnhancedDragDrop } from './hooks/useEnhancedDragDrop';
import { useThemeCustomization } from './hooks/useThemeCustomization';
import { ProgramType, Application, FacultyContact, ApplicationStatus } from './types';
import { DropResult } from '@hello-pangea/dnd';
import { exportToCSV, parseCSV } from './utils';
import { ApplicationSearchIndexWrapper } from './utils/searchIndexWrapper';
import { DESKTOP_BRIDGE_READY_EVENT, isDesktopRuntime } from './lib/desktopBridge';
import { TAG_REMOVE_PREFIX } from './constants';

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
const ColumnConfigModal = lazy(() => import('./components/ColumnConfigModal'));
const ViewPresetModal = lazy(() => import('./components/ViewPresetModal'));
const AutomationRulesModal = lazy(() => import('./components/AutomationRulesModal'));

import { useAppCommands } from './hooks/useAppCommands';

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

  const {
    isSelectionMode,
    selectedIds,
    selectedCount,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedApplications,
  } = useBulkSelection(applications);

  const [isComparisonOpen, setIsComparisonOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [isBulkOperationsOpen, setIsBulkOperationsOpen] = React.useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = React.useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = React.useState(false);
  const [quickCaptureText, setQuickCaptureText] = React.useState<string>('');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [advancedSearchState, setAdvancedSearchState] = React.useState<{
    active: boolean;
    results: Application[];
  }>({ active: false, results: [] });
  const [isExportConfigOpen, setIsExportConfigOpen] = React.useState(false);
  const [isKanbanConfigOpen, setIsKanbanConfigOpen] = React.useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = React.useState(false);
  const [isViewPresetOpen, setIsViewPresetOpen] = React.useState(false);
  const [isAutomationRulesOpen, setIsAutomationRulesOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<'shortcuts' | 'views' | 'general' | 'fields' | 'kanban' | 'automation'>('shortcuts');

  // Lock scroll when advanced filter (inline modal) is open
  useLockBodyScroll(isAdvancedFilterOpen);
  useEscapeKey(isAdvancedFilterOpen, () => setIsAdvancedFilterOpen(false));

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

  const { savedSearches, searchHistory, loadSearch } = useAdvancedSearch(applications);

  // Use advanced filter if active, otherwise use basic filter
  const applicationsToFilter = activeFilter ? advancedFilteredApplications : applications;

  // Use advanced search results if available, otherwise use all applications
  const applicationsForFilter = advancedSearchState.active
    ? advancedSearchState.results
    : applicationsToFilter;

  const {
    searchQuery,
    setSearchQuery,
    sortConfig,
    requestSort,
    filteredAndSortedApplications,
  } = useSortAndFilter(applicationsForFilter);

  // Search Index (using Web Worker when available)
  const searchIndexRef = useRef<ApplicationSearchIndexWrapper | null>(null);
  if (!searchIndexRef.current) {
    searchIndexRef.current = new ApplicationSearchIndexWrapper();
  }
  const searchIndex = searchIndexRef.current;
  const [searchResults, setSearchResults] = React.useState<Application[]>([]);

  // Enhanced search with index (async with worker)
  useEffect(() => {
    searchIndex.updateApplications(applications).catch((error) => {
      console.error('Failed to update search index:', error);
    });
  }, [applications, searchIndex]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    searchIndex.search(searchQuery)
      .then(results => {
        if (!cancelled) {
          setSearchResults(results);
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Search error:', error);
          setSearchResults([]);
        }
      });
    return () => { cancelled = true; };
  }, [searchIndex, searchQuery]);

  useEffect(() => {
    return () => {
      searchIndex.destroy();
    };
  }, [searchIndex]);

  const finalFilteredApplications = useMemo(() => {
    if (searchQuery.trim() && searchQuery.length >= 2 && searchResults.length > 0) {
      // Merge with current filter results
      const indexedIds = new Set(searchResults.map(app => app.id));
      return filteredAndSortedApplications.filter(app => indexedIds.has(app.id));
    }
    return filteredAndSortedApplications;
  }, [filteredAndSortedApplications, searchQuery, searchResults]);

  const [defaultProgramType, setDefaultProgramType] = useLocalStorage<ProgramType>('default-program-type', ProgramType.PhD);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('view-mode', 'list');

  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();

  // Command Palette
  const commandPalette = useCommandPalette();

  // Keyboard Shortcuts
  useKeyboardShortcuts();

  // Automation
  const { executeRules } = useAutomation();

  // View state
  const viewState = useViewState(viewMode);

  // Toast notifications
  const { toasts, showToast, removeToast } = useToast();
  const { applyActiveTheme } = useThemeCustomization();

  useEffect(() => {
    applyActiveTheme();
  }, [applyActiveTheme]);

  const handleSave = React.useCallback((app: Application) => {
    try {
      if (editingApplication) {
        updateApplication(app);
        const updates = executeRules(app, 'field_updated', { field: 'any' });
        if (updates) {
          updateApplication({ ...app, ...updates });
        }
      } else {
        const updates = executeRules(app, 'application_created');
        const finalApp = updates ? { ...app, ...updates } : app;
        addApplication(finalApp);
      }
      closeModal();
      showToast('success', 'Application saved successfully');
    } catch (error) {
      console.error('Failed to save application:', error);
      showToast('error', 'Failed to save application. Please try again.', 'Error');
    }
  }, [editingApplication, updateApplication, addApplication, closeModal, executeRules, showToast]);

  const handleSaveFacultyContact = React.useCallback(
    (contact: FacultyContact, universityName: string, isNewUniversity: boolean) => {
      try {
        addFacultyContact(contact, universityName, isNewUniversity, defaultProgramType);
        closeFacultyModal();
        showToast('success', 'Faculty contact saved successfully');
      } catch (error) {
        console.error('Failed to save faculty contact:', error);
        showToast('error', 'Failed to save faculty contact. Please try again.', 'Error');
      }
    },
    [addFacultyContact, closeFacultyModal, defaultProgramType, showToast]
  );

  const handleExportWithConfig = React.useCallback(() => {
    setIsExportConfigOpen(true);
  }, []);

  const handleQuickCapture = React.useCallback((text: string) => {
    // Store the text and open quick capture modal - it will handle parsing
    setQuickCaptureText(text);
    setIsQuickCaptureOpen(true);
  }, []);

  const handleAdvancedSearch = React.useCallback((results: Application[], query: string) => {
    const active = query.trim().length > 0;

    setAdvancedSearchState(prev => {
      if (prev.active === active && prev.results === results) {
        return prev;
      }

      return { active, results };
    });
  }, []);

  const handleExport = React.useCallback(async (format: 'csv' | 'json' | 'ics' | 'md' | 'pdf', selectedFields?: string[]) => {
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
      const { exportToJSON } = await import('./utils/exportFormats');
      const dataStr = exportToJSON(appsToExport, selectedFields);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `applications-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }, [applications, getSelectedApplications, isSelectionMode, selectedCount]);

  const openSettings = React.useCallback(() => {
    setSettingsOpen(true);
  }, []);

  // Initialize App Commands
  useAppCommands({
    openCommandPalette: commandPalette.open,
    openModal,
    setViewMode,
    handleExport,
    openSettings,
    setSettingsTab,
    setIsBulkOperationsOpen,
    setIsQuickCaptureOpen,
    setIsHelpOpen,
    setIsAdvancedFilterOpen,
    setIsAutomationRulesOpen,
    setIsKanbanConfigOpen,
    setIsViewPresetOpen,
    setIsComparisonOpen,
    setSearchQuery,
    clearActiveFilter: clearFilter,
    setActiveFilter,
    loadSavedFilter: loadFilter,
    loadSavedSearch: loadSearch,
    savedSearches,
    searchHistory,
    applications,
    savedFilters,
    undo,
    redo,
    canUndo,
    canRedo,
  });

  const requestDelete = React.useCallback((id: string) => {
    deleteApplication(id);
    if (selectedIds.has(id)) {
      clearSelection();
    }
  }, [deleteApplication, selectedIds, clearSelection]);

  const handleBulkStatusChange = React.useCallback((status: ApplicationStatus) => {
    const selected = getSelectedApplications();
    if (!selected.length) {
      return;
    }

    selected.forEach(app => {
      const updatedApp = { ...app, status };
      updateApplication(updatedApp);
      const updates = executeRules(updatedApp, 'status_changed', { newStatus: status, oldStatus: app.status });
      if (updates) {
        updateApplication({ ...updatedApp, ...updates });
      }
    });

    showToast('success', `Updated ${selected.length} application(s) to ${status}`);
    clearSelection();
  }, [clearSelection, executeRules, getSelectedApplications, showToast, updateApplication]);

  const handleBulkDelete = React.useCallback(() => {
    if (!selectedCount) {
      return;
    }

    showConfirmation(
      'Delete Selected Applications',
      `Delete ${selectedCount} selected application(s)?`,
      () => {
        getSelectedApplications().forEach(app => deleteApplication(app.id));
        clearSelection();
      },
      true
    );
  }, [clearSelection, deleteApplication, getSelectedApplications, selectedCount, showConfirmation]);

  const handleBulkCompare = React.useCallback(() => {
    if (selectedCount > 0) {
      setIsComparisonOpen(true);
    }
  }, [selectedCount]);

  const handleBulkUpdate = React.useCallback((updates: Partial<Application> | ((app: Application) => Partial<Application>), ids: string[]) => {
    ids.forEach(id => {
      const app = applications.find(a => a.id === id);
      if (app) {
        const appUpdates = { ...(typeof updates === 'function' ? updates(app) : updates) };

        // Handle tag removal
        if (appUpdates.tags) {
          const removeTags = appUpdates.tags.filter(t => t.startsWith(TAG_REMOVE_PREFIX));
          const addTags = appUpdates.tags.filter(t => !t.startsWith(TAG_REMOVE_PREFIX));
          const currentTags = app.tags || [];
          const tagsToRemove = removeTags.map(t => t.slice(TAG_REMOVE_PREFIX.length));
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

  const handleImport = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

        let json: unknown;

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
        const validApplications = (json as unknown[]).filter((item: unknown, index: number) => {
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
  }, [showToast, showConfirmation, mergeApplications, importApplications]);

  const updateApplicationWithAutomation = React.useCallback((updatedApp: Application) => {
    const app = applications.find(a => a.id === updatedApp.id);
    if (!app) return;

    updateApplication(updatedApp);

    if (app.status !== updatedApp.status) {
      const updates = executeRules(updatedApp, 'status_changed', {
        newStatus: updatedApp.status,
        oldStatus: app.status,
      });
      if (updates) {
        updateApplication({ ...updatedApp, ...updates });
      }
    }
  }, [applications, updateApplication, executeRules]);

  const enhancedDragDrop = useEnhancedDragDrop(applications, updateApplicationWithAutomation, handleBulkUpdate);

  const handleDragEnd = React.useCallback((result: DropResult) => {
    enhancedDragDrop.handleDragEnd(result);
  }, [enhancedDragDrop]);

  const [desktopRuntime, setDesktopRuntime] = React.useState(() => isDesktopRuntime());

  useEffect(() => {
    const refreshDesktopRuntime = () => {
      setDesktopRuntime(isDesktopRuntime());
    };

    window.addEventListener(DESKTOP_BRIDGE_READY_EVENT, refreshDesktopRuntime);
    return () => {
      window.removeEventListener(DESKTOP_BRIDGE_READY_EVENT, refreshDesktopRuntime);
    };
  }, []);

  const currentViewState = viewState.getViewState();
  const viewPresetCurrentState = useMemo(() => ({
    sortConfig,
    filters: {},
    searchQuery,
    columnWidths: currentViewState?.columnWidths,
    visibleColumns: currentViewState?.visibleColumns,
    columnOrder: currentViewState?.columnOrder,
  }), [sortConfig, searchQuery, currentViewState]);

  const handleQuickCaptureSave = useCallback((app: Application) => {
    const updates = executeRules(app, 'application_created');
    const finalApp = updates ? { ...app, ...updates } : app;
    addApplication(finalApp);
    setQuickCaptureText('');
    showToast('success', 'Application captured successfully!', 'Quick Capture');
  }, [executeRules, addApplication, showToast]);

  const handleAddNew = useCallback(() => openModal(null), [openModal]);
  const handleShowHelp = useCallback(() => setIsHelpOpen(true), []);
  const handleCloseHelp = useCallback(() => setIsHelpOpen(false), []);
  const handleCloseComparison = useCallback(() => setIsComparisonOpen(false), []);
  const handleCloseBulkOps = useCallback(() => setIsBulkOperationsOpen(false), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleOpenKanbanConfig = useCallback(() => setIsKanbanConfigOpen(true), []);
  const handleOpenColumnConfig = useCallback(() => setIsColumnConfigOpen(true), []);
  const handleOpenAutomationRules = useCallback(() => setIsAutomationRulesOpen(true), []);
  const handleOpenViewPresets = useCallback(() => setIsViewPresetOpen(true), []);
  const handleCloseQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(false);
    setQuickCaptureText('');
  }, []);
  const handleCloseExportConfig = useCallback(() => setIsExportConfigOpen(false), []);
  const handleCloseKanbanConfig = useCallback(() => setIsKanbanConfigOpen(false), []);
  const handleCloseColumnConfig = useCallback(() => setIsColumnConfigOpen(false), []);
  const handleCloseViewPreset = useCallback(() => setIsViewPresetOpen(false), []);
  const handleCloseAutomationRules = useCallback(() => setIsAutomationRulesOpen(false), []);

  return (
    <>
      <TitleBar />
      <div className={`min-h-screen text-[#F5D7DA] font-sans p-4 sm:p-6 lg:p-8 ${desktopRuntime ? 'pt-14 sm:pt-16 lg:pt-16' : ''} relative z-10`}>
        <div className="max-w-7xl mx-auto">
        <Header
          onAddNew={handleAddNew}
          onAddFaculty={openFacultyModal}
          defaultProgramType={defaultProgramType}
          onSetDefaultProgramType={setDefaultProgramType}
          onExport={handleExportWithConfig}
          onImport={handleImport}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onShowHelp={handleShowHelp}
          onQuickCapture={handleQuickCapture}
          applications={applications}
          onSearch={handleAdvancedSearch}
        />

        <MainContent
          viewMode={viewMode}
          applications={applications}
          filteredAndSortedApplications={finalFilteredApplications}
          sortConfig={sortConfig}
          requestSort={requestSort}
          searchQuery={searchQuery}
          hasActiveAdvancedSearch={advancedSearchState.active}
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
          applications={applications}
        />
        <FacultyContactModal
          isOpen={isFacultyModalOpen}
          onClose={closeFacultyModal}
          onSave={handleSaveFacultyContact}
          applications={applications}
        />
        <HelpModal
          isOpen={isHelpOpen}
          onClose={handleCloseHelp}
        />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        {isComparisonOpen && (
          <ComparisonModal
            isOpen={true}
            onClose={handleCloseComparison}
            applications={getSelectedApplications()}
          />
        )}
      </Suspense>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
      />

      {/* Bulk Operations Modal */}
      {isBulkOperationsOpen && (
        <BulkOperationsModal
          isOpen={true}
          onClose={handleCloseBulkOps}
          selectedApplications={getSelectedApplications()}
          onUpdate={handleBulkUpdate}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          isOpen={true}
          onClose={handleCloseSettings}
          onOpenKanbanConfig={handleOpenKanbanConfig}
          onOpenColumnConfig={handleOpenColumnConfig}
          onOpenAutomationRules={handleOpenAutomationRules}
          onOpenViewPresets={handleOpenViewPresets}
          initialTab={settingsTab}
        />
      )}

      {isQuickCaptureOpen && (
        <QuickCaptureModal
          isOpen={true}
          onClose={handleCloseQuickCapture}
          onSave={handleQuickCaptureSave}
          initialText={quickCaptureText}
        />
      )}

      {/* Export Config Modal */}
      {isExportConfigOpen && (
        <ExportConfigModal
          isOpen={true}
          onClose={handleCloseExportConfig}
          applications={selectedCount > 0 ? getSelectedApplications() : finalFilteredApplications}
          onExport={(format, selectedFields) => {
            const mappedFormat = format === 'markdown' ? 'md' : format;
            handleExport(mappedFormat, selectedFields);
            setIsExportConfigOpen(false);
          }}
        />
      )}

      {/* Kanban Config Modal */}
      {isKanbanConfigOpen && (
        <KanbanConfigModal
          isOpen={true}
          onClose={handleCloseKanbanConfig}
        />
      )}

      {isColumnConfigOpen && (
        <ColumnConfigModal
          isOpen={true}
          onClose={handleCloseColumnConfig}
          viewMode={viewMode}
        />
      )}

      {/* View Preset Modal */}
      {isViewPresetOpen && (
        <ViewPresetModal
          isOpen={true}
          onClose={handleCloseViewPreset}
          viewMode={viewMode}
          currentState={viewPresetCurrentState}
        />
      )}

      {/* Automation Rules Modal */}
      {isAutomationRulesOpen && (
        <AutomationRulesModal
          isOpen={true}
          onClose={handleCloseAutomationRules}
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </>
  );
};

export default App;
