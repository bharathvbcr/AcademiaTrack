import React, { Suspense, lazy } from 'react';
import { Application, ApplicationStatus } from '../types';
import { SortConfig, SortKey } from '../hooks/useSortAndFilter';
import { DropResult } from '@hello-pangea/dnd';
import ApplicationList from './ApplicationList';
import SortControls from './SortControls';
import BulkActionsBar from './BulkActionsBar';

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
    // Bulk selection props
    isSelectionMode: boolean;
    selectedIds: Set<string>;
    selectedCount: number;
    toggleSelectionMode: () => void;
    toggleSelection: (id: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    onBulkStatusChange: (status: ApplicationStatus) => void;
    onBulkDelete: () => void;
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
    handleDragEnd,
    isSelectionMode,
    selectedIds,
    selectedCount,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    onBulkStatusChange,
    onBulkDelete,
}) => {
    return (
        <main className="mt-8">
            {/* Bulk Actions Bar */}
            {isSelectionMode && (
                <BulkActionsBar
                    selectedCount={selectedCount}
                    totalCount={filteredAndSortedApplications.length}
                    onSelectAll={selectAll}
                    onClearSelection={clearSelection}
                    onBulkStatusChange={onBulkStatusChange}
                    onBulkDelete={onBulkDelete}
                    onExitSelectionMode={toggleSelectionMode}
                />
            )}

            <Suspense fallback={<div>Loading...</div>}>
                <DashboardSummary applications={applications} viewMode={viewMode} />
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
                        isSelectionMode={isSelectionMode}
                        selectedIds={selectedIds}
                        onToggleSelection={toggleSelection}
                        onEnterSelectionMode={toggleSelectionMode}
                    />
                </>
            ) : viewMode === 'kanban' ? (
                <Suspense fallback={<div>Loading Kanban Board...</div>}>
                    <KanbanBoard
                        applications={filteredAndSortedApplications}
                        onDragEnd={handleDragEnd}
                        onEdit={openModal}
                        onUpdate={updateApplication}
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
