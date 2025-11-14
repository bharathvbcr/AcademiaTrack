import React, { lazy, Suspense } from 'react';
import { useApplications } from './hooks/useApplications';
import { useAppModals } from './hooks/useAppModals';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import Header from './components/Header';
import ApplicationList from './components/ApplicationList';
import SortControls from './components/SortControls';
import { exportToCSV } from './utils';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ProgramType } from './types';

const DashboardSummary = lazy(() => import('./components/DashboardSummary'));
const ApplicationModal = lazy(() => import('./components/ApplicationModal'));
const FacultyContactModal = lazy(() => import('./components/FacultyContactModal'));

const App: React.FC = () => {
  const {
    applications,
    addApplication,
    updateApplication,
    deleteApplication,
    addFacultyContact,
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

  const handleExport = () => {
    exportToCSV(applications);
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
        />
        <main className="mt-8">
          <Suspense fallback={<div>Loading...</div>}>
            <DashboardSummary applications={applications} />
          </Suspense>
          
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