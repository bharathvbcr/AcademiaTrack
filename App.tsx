import React, { lazy, Suspense, useState } from 'react';
import { useApplications } from './hooks/useApplications';
import { useAppModals } from './hooks/useAppModals';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import Header from './components/Header';
import ApplicationList from './components/ApplicationList';
import SortControls from './components/SortControls';
import { exportToCSV } from './utils';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ProgramType, ApplicationStatus } from './types';
import { DropResult } from '@hello-pangea/dnd';
import ConfirmationModal from './components/ConfirmationModal';

const DashboardSummary = lazy(() => import('./components/DashboardSummary'));
const ApplicationModal = lazy(() => import('./components/ApplicationModal'));
const FacultyContactModal = lazy(() => import('./components/FacultyContactModal'));
const KanbanBoard = lazy(() => import('./components/KanbanBoard'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const BudgetView = lazy(() => import('./components/BudgetView'));

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

  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const closeConfirmation = () => setConfirmation(prev => ({ ...prev, isOpen: false }));

  const requestDelete = (id: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Delete Application',
      message: 'Are you sure you want to delete this application? This action cannot be undone.',
      isDanger: true,
      onConfirm: () => deleteApplication(id)
    });
  };

  useKeyboardShortcuts({
    'Ctrl+n': () => openModal(null),
    'Ctrl+1': () => setViewMode('list'),
    'Ctrl+2': () => setViewMode('kanban'),
    'Ctrl+3': () => setViewMode('calendar'),
    'Ctrl+4': () => setViewMode('budget'),
  });

  const handleSave = (app: any) => {
    if (editingApplication) {
      updateApplication(app);
    } else {
      addApplication(app);
    }
    closeModal();
  };

  const handleSaveFacultyContact = (contact: any, universityName: string, isNewUniversity: boolean) => {
    addFacultyContact(contact, universityName, isNewUniversity, defaultProgramType);
    closeFacultyModal();
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
          setConfirmation({
            isOpen: true,
            title: 'Import Data',
            message: 'This will overwrite your current data. Are you sure you want to proceed?',
            isDanger: true,
            onConfirm: () => importApplications(json)
          });
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
        status: destination.droppableId as ApplicationStatus
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
        <main className="mt-8">
          <Suspense fallback={<div>Loading...</div>}>
            <DashboardSummary applications={applications} />
          </Suspense>

          {viewMode === 'list' ? (
            <>
              {applications.length > 0 && (
                <SortControls
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              )}

              <ApplicationList
                applications={filteredAndSortedApplications}
                onEdit={openModal}
                onDelete={requestDelete}
                onUpdate={updateApplication}
                hasActiveFilter={searchQuery.length > 0}
              />
            </>
          ) : viewMode === 'kanban' ? (
            <Suspense fallback={<div>Loading Kanban Board...</div>}>
              <KanbanBoard
                applications={filteredAndSortedApplications}
                onDragEnd={handleDragEnd}
                onEdit={openModal}
              />
            </Suspense>
          ) : viewMode === 'budget' ? (
            <Suspense fallback={<div>Loading Budget...</div>}>
              <BudgetView applications={filteredAndSortedApplications} />
            </Suspense>
          ) : (
            <Suspense fallback={<div>Loading Calendar...</div>}>
              <CalendarView
                applications={filteredAndSortedApplications}
                onEdit={openModal}
              />
            </Suspense>
          )}
        </main>
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
          applicationToEdit={editingApplication}
          defaultProgramType={defaultProgramType}
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