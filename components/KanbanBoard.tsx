import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Application, ApplicationStatus } from '../types';
import KanbanColumn from './KanbanColumn';
import { useKanbanConfig } from '../hooks/useKanbanConfig';
import { STATUS_OPTIONS } from '../constants';

interface KanbanBoardProps {
    applications: Application[];
    onDragEnd: (result: DropResult) => void;
    onEdit: (app: Application) => void;
    onUpdate?: (app: Application) => void;
    onDuplicate: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = React.memo(({ applications, onDragEnd, onEdit, onUpdate, onDuplicate }) => {
    const { statusConfig } = useKanbanConfig();
    
    // Use configured statuses, fallback to default if config is empty
    const activeStatuses = React.useMemo(() => {
        if (statusConfig.length > 0) {
            return statusConfig.sort((a, b) => a.order - b.order);
        }
        // Fallback to default statuses
        return STATUS_OPTIONS.map((status, index) => ({
            id: status,
            name: status,
            status: status,
            color: '',
            order: index,
            isCustom: false,
        }));
    }, [statusConfig]);

    // Group applications by status
    const applicationsByStatus = React.useMemo(() => {
        const grouped: Record<string, Application[]> = {};
        activeStatuses.forEach(statusConfig => {
            grouped[statusConfig.status] = [];
        });
        applications.forEach(app => {
            if (grouped[app.status]) {
                grouped[app.status].push(app);
            } else {
                // Fallback for unknown statuses - create "Other" column if needed
                if (!grouped['Other']) grouped['Other'] = [];
                grouped['Other'].push(app);
            }
        });
        return grouped;
    }, [applications, activeStatuses]);

    return (
        <div className="h-full min-h-[calc(100vh-200px)]">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-wrap justify-center gap-6 pb-8">
                    {activeStatuses.map(statusConfig => (
                        <KanbanColumn
                            key={statusConfig.id}
                            status={statusConfig.status as ApplicationStatus}
                            applications={applicationsByStatus[statusConfig.status] || []}
                            onEdit={onEdit}
                            onUpdate={onUpdate}
                            onDuplicate={onDuplicate}
                            statusConfig={statusConfig}
                        />
                    ))}
                    {/* Show "Other" column if there are applications with unknown statuses */}
                    {applicationsByStatus['Other'] && applicationsByStatus['Other'].length > 0 && (
                        <KanbanColumn
                            key="other"
                            status={'Other' as ApplicationStatus}
                            applications={applicationsByStatus['Other']}
                            onEdit={onEdit}
                            onUpdate={onUpdate}
                            onDuplicate={onDuplicate}
                        />
                    )}
                </div>
            </DragDropContext>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if applications array changes significantly
    if (prevProps.applications.length !== nextProps.applications.length) return false;
    // Check if any application status changed (affects grouping)
    const prevStatuses = new Set(prevProps.applications.map(a => a.status));
    const nextStatuses = new Set(nextProps.applications.map(a => a.status));
    if (prevStatuses.size !== nextStatuses.size) return false;
    return true;
});

KanbanBoard.displayName = 'KanbanBoard';

export default KanbanBoard;
