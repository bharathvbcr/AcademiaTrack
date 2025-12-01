import React, { Suspense, lazy } from 'react';
import { Application } from '../types';
import { SortConfig, SortKey } from '../hooks/useSortAndFilter';
import { DropResult } from '@hello-pangea/dnd';
import ApplicationList from './ApplicationList';
import SortControls from './SortControls';

const DashboardSummary = lazy(() => import('./DashboardSummary'));
const KanbanBoard = lazy(() => import('./KanbanBoard'));
const CalendarView = lazy(() => import('./CalendarView'));
const BudgetView = lazy(() => import('./BudgetView'));

interface MainContentProps {
    viewMode: 'list' | 'kanban' | 'calendar' | 'budget';
    applications: Application[];
    filteredAndSortedApplications: Application[];
    sortConfig: SortConfig;
    requestSort: (key: SortKey) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    openModal: (app: Application | null) => void;
    requestDelete: (id: string) => void;
    updateApplication: (app: Application) => void;
    handleDragEnd: (result: DropResult) => void;
}

const MainContent: React.FC<MainContentProps> = ({
    viewMode,
    applications,
    filteredAndSortedApplications,
    sortConfig,
    requestSort,
    searchQuery,
    setSearchQuery,
    openModal,
    requestDelete,
    updateApplication,
    handleDragEnd
}) => {
    return (
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
    );
};

export default MainContent;
