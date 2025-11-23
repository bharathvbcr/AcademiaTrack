import React, { lazy, Suspense, useState } from 'react';
import { useApplications } from './hooks/useApplications';
import { useAppModals } from './hooks/useAppModals';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import Header from './components/Header';
import ApplicationList from './components/ApplicationList';
import SortControls from './components/SortControls';
import { exportToCSV } from './utils';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ProgramType, ApplicationStatus } from './types';
import { DropResult } from '@hello-pangea/dnd';

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
        if (Array.isArray(json)) {
          if (window.confirm('This will overwrite your current data. Are you sure?')) {
            importApplications(json);
          }
        } else {
          alert('Invalid JSON format. Expected an array of applications.');
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const app = applications.find(a => a.id === draggableId);

    if (app && app.status !== destination.droppableId) {
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
                onDelete={deleteApplication}
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