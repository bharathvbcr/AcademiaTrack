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
import { SkeletonCard } from './SkeletonLoader';
import DataValidationPanel from './DataValidationPanel';
import AdvancedAnalyticsPanel from './AdvancedAnalyticsPanel';
import { getStorageItem } from '../utils/browserStorage';
import { ViewMode } from '../hooks/useViewState';
import { UseAIReturn } from '../hooks/useAI';
import { useBulkSelectionContext } from '../contexts/BulkSelectionContext';
import { useApplicationActionsContext } from '../contexts/ApplicationActionsContext';

const DashboardSummary = lazy(() => import('./DashboardSummary'));
const DashboardAIBriefing = lazy(() => import('./DashboardAIBriefing'));
const KanbanBoard = lazy(() => import('./KanbanBoard'));
const CalendarView = lazy(() => import('./CalendarView'));
const BudgetView = lazy(() => import('./BudgetView'));
const FacultyView = lazy(() => import('./FacultyView'));
const RecommendersView = lazy(() => import('./RecommendersView'));
const TimelineView = lazy(() => import('./TimelineView'));

interface MainContentProps {
    viewMode: ViewMode;
    applications: Application[];
    filteredAndSortedApplications: Application[];
    sortConfig: SortConfig;
    requestSort: (key: SortKey) => void;
    searchQuery: string;
    hasActiveAdvancedSearch: boolean;
    setSearchQuery: (query: string) => void;
    handleDragEnd: (result: DropResult) => void;
    // Bulk action bar props (consumed at this level by BulkActionsBar)
    selectedCount: number;
    toggleSelectionMode: () => void;
    selectAll: () => void;
    clearSelection: () => void;
    onBulkStatusChange: (status: ApplicationStatus) => void;
    onBulkDelete: () => void;
    onBulkCompare: () => void;
    /** Local-first AI subsystem, used by the dashboard briefing card. */
    ai: UseAIReturn;
    /** Opens Settings on the AI tab so the user can configure a local model. */
    onConfigureAI: () => void;
}

const LoadingFallback: React.FC<{ text?: string }> = ({ text }) => (
    <div className="space-y-4">
        {text && (
            <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="md" text={text} />
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard count={6} />
        </div>
    </div>
);

const MainContent: React.FC<MainContentProps> = ({
    viewMode,
    applications,
    filteredAndSortedApplications,
    sortConfig,
    requestSort,
    searchQuery,
    hasActiveAdvancedSearch,
    setSearchQuery,
    handleDragEnd,
    selectedCount,
    toggleSelectionMode,
    selectAll,
    clearSelection,
    onBulkStatusChange,
    onBulkDelete,
    onBulkCompare,
    ai,
    onConfigureAI,
}) => {
    const { isSelectionMode, selectedIds, onToggleSelection, onEnterSelectionMode } = useBulkSelectionContext();
    const { openModal, requestDelete, updateApplication, duplicateApplication } = useApplicationActionsContext();
    // Read + parse the persisted view-state once and keep a stable reference so
    // memoized children (ApplicationList) aren't re-rendered by a new array on
    // every parent render.
    const visibleColumns = React.useMemo<string[] | undefined>(() => {
        const configured = getStorageItem('view-states');
        if (!configured) return undefined;

        try {
            const parsed = JSON.parse(configured);
            return parsed?.list?.visibleColumns as string[] | undefined;
        } catch {
            return undefined;
        }
    }, []);

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
                            hasActiveFilter={searchQuery.length > 0 || hasActiveAdvancedSearch}
                            isSelectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelection={onToggleSelection}
                            onEnterSelectionMode={onEnterSelectionMode}
                            visibleColumns={visibleColumns}
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

            {applications.length > 0 && (
                <Suspense fallback={null}>
                    <DashboardAIBriefing
                        applications={applications}
                        ai={ai}
                        onConfigureAI={onConfigureAI}
                    />
                </Suspense>
            )}

            <DataValidationPanel applications={applications} />
            <AdvancedAnalyticsPanel applications={applications} />

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
