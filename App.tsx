import React, { lazy, Suspense } from 'react';
import { useApplications } from './hooks/useApplications';
import { useAppModals } from './hooks/useAppModals';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useConfirmation } from './hooks/useConfirmation';
import { useDarkMode } from './hooks/useDarkMode';
import { useBulkSelection } from './hooks/useBulkSelection';
import { ProgramType, Application, FacultyContact, ApplicationStatus } from './types';
import { DropResult } from '@hello-pangea/dnd';
import { exportToCSV, parseCSV } from './utils';
import { downloadICS } from './utils/calendarExport';

import Header from './components/Header';
import ConfirmationModal from './components/ConfirmationModal';
import MainContent from './components/MainContent';

const ApplicationModal = lazy(() => import('./components/ApplicationModal'));
const FacultyContactModal = lazy(() => import('./components/FacultyContactModal'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const ComparisonModal = lazy(() => import('./components/ComparisonModal'));

const App: React.FC = () => {
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

  const {
    searchQuery,
    setSearchQuery,
    sortConfig,
    requestSort,
    filteredAndSortedApplications,
  } = useSortAndFilter(applications);

  const [defaultProgramType, setDefaultProgramType] = useLocalStorage<ProgramType>('default-program-type', ProgramType.PhD);
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline'>('view-mode', 'list');

  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();
  const { theme, cycleTheme } = useDarkMode();
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

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

  const handleSave = React.useCallback((app: Application) => {
    try {
      if (editingApplication) {
        updateApplication(app);
      } else {
        addApplication(app);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save application:', error);
      if (window.electron) {
        window.electron.showNotification('Error', 'Failed to save application. Please try again.');
      }
    }
  }, [editingApplication, updateApplication, addApplication, closeModal]);

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

  const handleExport = (format: 'csv' | 'json' | 'ics') => {
    if (format === 'csv') {
      exportToCSV(applications);
    } else if (format === 'ics') {
      downloadICS(applications);
    } else {
      const dataStr = JSON.stringify(applications, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `applications-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
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
          'id' in item &&
          ('universityName' in item || 'university' in item) // Loose validation for CSV
        );

        if (isValid) {
          if (file.name.toLowerCase().endsWith('.csv')) {
            showConfirmation(
              'Import CSV Data',
              `Found ${json.length} applications. This will ADD them to your current list. Proceed?`,
              () => mergeApplications(json),
              false // Not dangerous
            );
          } else {
            showConfirmation(
              'Import JSON Data',
              'This will OVERWRITE your current data. Are you sure you want to proceed?',
              () => importApplications(json),
              true // Dangerous
            );
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

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
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
          theme={theme}
          cycleTheme={cycleTheme}
          onShowHelp={() => setIsHelpOpen(true)}
        />

        <MainContent
          viewMode={viewMode}
          applications={applications}
          filteredAndSortedApplications={filteredAndSortedApplications}
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
    </div>
  );
};

export default App;