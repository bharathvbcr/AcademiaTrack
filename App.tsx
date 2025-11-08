import React, { useState, useMemo } from 'react';
import { Application, ProgramType } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import Header from './components/Header';
import ApplicationList from './components/ApplicationList';
import ApplicationModal from './components/ApplicationModal';
import DashboardSummary from './components/DashboardSummary';
import SortControls from './components/SortControls';
import { exportToCSV } from './utils';

type SortKey = 'deadline' | 'universityName' | 'status';

const App: React.FC = () => {
  const [applications, setApplications] = useLocalStorage<Application[]>('phd-applications', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({
    key: 'deadline',
    direction: 'ascending',
  });
  const [defaultProgramType, setDefaultProgramType] = useLocalStorage<ProgramType>('default-program-type', ProgramType.PhD);

  const handleAddNew = () => {
    setEditingApplication(null);
    setIsModalOpen(true);
  };

  const handleEdit = (app: Application) => {
    setEditingApplication(app);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      setApplications(apps => apps.filter(app => app.id !== id));
    }
  };

  const handleSave = (app: Application) => {
    if (editingApplication) {
      setApplications(apps => apps.map(a => a.id === app.id ? app : a));
    } else {
      setApplications(apps => [...apps, { ...app, id: new Date().toISOString() }]);
    }
    setIsModalOpen(false);
    setEditingApplication(null);
  };

  const handleUpdateApplication = (updatedApp: Application) => {
    setApplications(apps => apps.map(app => app.id === updatedApp.id ? updatedApp : app));
  };

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleExport = () => {
    exportToCSV(applications);
  };

  const filteredAndSortedApplications = useMemo(() => {
    const filtered = applications.filter(app =>
      app.universityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.programName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortableItems = [...filtered];
    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            let comparison = 0;
            if (sortConfig.key === 'deadline') {
                comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
            } else {
                if (valA > valB) {
                    comparison = 1;
                } else if (valA < valB) {
                    comparison = -1;
                }
            }
            
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }
    return sortableItems;
  }, [applications, sortConfig, searchQuery]);

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header 
          onAddNew={handleAddNew}
          defaultProgramType={defaultProgramType}
          onSetDefaultProgramType={setDefaultProgramType} 
          onExport={handleExport}
        />
        <main className="mt-8">
          <DashboardSummary applications={applications} />
          
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
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdate={handleUpdateApplication}
            hasActiveFilter={searchQuery.length > 0}
          />
        </main>
      </div>
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        applicationToEdit={editingApplication}
        defaultProgramType={defaultProgramType}
      />
    </div>
  );
};

export default App;