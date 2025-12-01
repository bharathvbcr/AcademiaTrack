import React, { lazy, Suspense } from 'react';
import { useApplications } from './hooks/useApplications';
import { useAppModals } from './hooks/useAppModals';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useConfirmation } from './hooks/useConfirmation';
import { ProgramType, Application, FacultyContact } from './types';
import { DropResult } from '@hello-pangea/dnd';
import { exportToCSV } from './utils';

import Header from './components/Header';
import ConfirmationModal from './components/ConfirmationModal';
import MainContent from './components/MainContent';

const ApplicationModal = lazy(() => import('./components/ApplicationModal'));
const FacultyContactModal = lazy(() => import('./components/FacultyContactModal'));

const App: React.FC = () => {
  const {
    applications,
    addApplication,
    updateApplication,
    deleteApplication,
    addFacultyContact,
    importApplications,
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
    searchQuery,
    setSearchQuery,
    sortConfig,
    requestSort,
    filteredAndSortedApplications,
  } = useSortAndFilter(applications);

  const [defaultProgramType, setDefaultProgramType] = useLocalStorage<ProgramType>('default-program-type', ProgramType.PhD);
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'kanban' | 'calendar' | 'budget'>('view-mode', 'list');

  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();

  const requestDelete = (id: string) => {
    showConfirmation(
      'Delete Application',
      'Are you sure you want to delete this application? This action cannot be undone.',
      () => deleteApplication(id),
      true
    );
  };

  useKeyboardShortcuts({
    'Ctrl+n': () => openModal(null),
    'Ctrl+1': () => setViewMode('list'),
    'Ctrl+2': () => setViewMode('kanban'),
    'Ctrl+3': () => setViewMode('calendar'),
    'Ctrl+4': () => setViewMode('budget'),
  });

  const handleSave = (app: Application) => {
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
  };

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

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      exportToCSV(applications);
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
        const json = JSON.parse(event.target?.result as string);
        // Basic validation
        const isValid = Array.isArray(json) && json.every(item =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          'universityName' in item &&
          'status' in item
        );

        if (isValid) {
          showConfirmation(
            'Import Data',
            'This will overwrite your current data. Are you sure you want to proceed?',
            () => importApplications(json),
            true
          );
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

  const handleDragEnd = (result: DropResult) => {
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
        status: destination.droppableId as any // Cast to any or import ApplicationStatus if needed, but ApplicationStatus is string enum so it should be fine if types match
      });
    }
  };

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
          handleDragEnd={handleDragEnd}
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
      </Suspense>
    </div>
  );
};

export default App;