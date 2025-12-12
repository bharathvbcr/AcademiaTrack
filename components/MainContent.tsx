import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Application, ApplicationStatus } from '../types';
import { SortConfig, SortKey } from '../hooks/useSortAndFilter';
import { DropResult } from '@hello-pangea/dnd';
import { pageVariants } from '../hooks/useAnimations';
import ApplicationList from './ApplicationList';
import SortControls from './SortControls';
import BulkActionsBar from './BulkActionsBar';
import LoadingSpinner from './LoadingSpinner';

const DashboardSummary = lazy(() => import('./DashboardSummary'));
const KanbanBoard = lazy(() => import('./KanbanBoard'));
const CalendarView = lazy(() => import('./CalendarView'));
const BudgetView = lazy(() => import('./BudgetView'));
const FacultyView = lazy(() => import('./FacultyView'));
const RecommendersView = lazy(() => import('./RecommendersView'));
const TimelineView = lazy(() => import('./TimelineView'));

interface MainContentProps {
    viewMode: 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline';
    applications: Application[];
    filteredAndSortedApplications: Application[];
    sortConfig: SortConfig;
    requestSort: (key: SortKey) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    openModal: (app: Application | null) => void;
    requestDelete: (id: string) => void;
    updateApplication: (app: Application) => void;
    duplicateApplication: (id: string) => void;
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
    onBulkCompare: () => void;
}

const LoadingFallback: React.FC<{ text?: string }> = ({ text }) => (
    <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text={text} />
    </div>
);

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
    duplicateApplication,
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
    onBulkCompare,
}) => {
    const renderViewContent = () => {
        switch (viewMode) {
            case 'list':
                return (
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
                            onDuplicate={duplicateApplication}
                            hasActiveFilter={searchQuery.length > 0}
                            isSelectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelection={toggleSelection}
                            onEnterSelectionMode={toggleSelectionMode}
                        />
                    </>
                );
            case 'kanban':
                return (
                    <Suspense fallback={<LoadingFallback text="Loading Kanban Board..." />}>
                        <KanbanBoard
                            applications={filteredAndSortedApplications}
                            onDragEnd={handleDragEnd}
                            onEdit={openModal}
                            onUpdate={updateApplication}
                            onDuplicate={duplicateApplication}
                        />
                    </Suspense>
                );
            case 'budget':
                return (
                    <Suspense fallback={<LoadingFallback text="Loading Budget..." />}>
                        <BudgetView applications={filteredAndSortedApplications} />
                    </Suspense>
                );
            case 'faculty':
                return (
                    <Suspense fallback={<LoadingFallback text="Loading Faculty..." />}>
                        <FacultyView
                            applications={applications}
                            updateApplication={updateApplication}
                            openModal={openModal}
                        />
                    </Suspense>
                );
            case 'recommenders':
                return (
                    <Suspense fallback={<LoadingFallback text="Loading Recommenders..." />}>
                        <RecommendersView
                            applications={applications}
                            updateApplication={updateApplication}
                            openModal={openModal}
                        />
                    </Suspense>
                );
            case 'timeline':
                return (
                    <Suspense fallback={<LoadingFallback text="Loading Timeline..." />}>
                        <div className="h-full overflow-hidden">
                            <TimelineView
                                applications={filteredAndSortedApplications}
                                onEdit={openModal}
                            />
                        </div>
                    </Suspense>
                );
            case 'calendar':
            default:
                return (
                    <Suspense fallback={<LoadingFallback text="Loading Calendar..." />}>
                        <CalendarView
                            applications={filteredAndSortedApplications}
                            onEdit={openModal}
                        />
                    </Suspense>
                );
        }
    };

    return (
        <main className="mt-8">
            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <BulkActionsBar
                            selectedCount={selectedCount}
                            totalCount={filteredAndSortedApplications.length}
                            onSelectAll={selectAll}
                            onClearSelection={clearSelection}
                            onBulkStatusChange={onBulkStatusChange}
                            onBulkDelete={onBulkDelete}
                            onBulkCompare={onBulkCompare}
                            onExitSelectionMode={toggleSelectionMode}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <Suspense fallback={<LoadingFallback />}>
                <DashboardSummary applications={applications} viewMode={viewMode} />
            </Suspense>

            {/* Animated View Container */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={viewMode}
                    variants={pageVariants}
                    initial="initial"
                    animate="enter"
                    exit="exit"
                >
                    {renderViewContent()}
                </motion.div>
            </AnimatePresence>
        </main>
    );
};

export default MainContent;
