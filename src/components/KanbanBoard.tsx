import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Application, ApplicationStatus } from '../types';
import KanbanColumn from './KanbanColumn';
import { STATUS_OPTIONS } from '../constants';
import { useCustomStatuses } from '../hooks/useCustomStatuses';

interface KanbanBoardProps {
    applications: Application[];
    onDragEnd: (result: DropResult) => void;
    onEdit: (app: Application) => void;
    onUpdate?: (app: Application) => void;
    onDuplicate: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ applications, onDragEnd, onEdit, onUpdate, onDuplicate }) => {
    const { allStatuses } = useCustomStatuses();
    
    // Group applications by status
    const applicationsByStatus = React.useMemo(() => {
        const grouped: Record<string, Application[]> = {};
        // Initialize with all available statuses (custom + default)
        allStatuses.forEach(status => {
            grouped[status.name] = [];
        });
        // Also include any statuses that exist in applications but aren't in our status list
        applications.forEach(app => {
            if (grouped[app.status]) {
                grouped[app.status].push(app);
            } else {
                // Fallback for unknown statuses
                if (!grouped['Other']) grouped['Other'] = [];
                grouped['Other'].push(app);
            }
        });
        return grouped;
    }, [applications, allStatuses]);

    return (
        <div className="h-full min-h-[calc(100vh-200px)]">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-wrap justify-center gap-6 pb-8">
                    {allStatuses.map(status => (
                        <KanbanColumn
                            key={status.id}
                            status={status.name as ApplicationStatus}
                            applications={applicationsByStatus[status.name] || []}
                            onEdit={onEdit}
                            onUpdate={onUpdate}
                            onDuplicate={onDuplicate}
                            statusColor={status.color}
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
                            statusColor="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        />
                    )}
                </div>
            </DragDropContext>
        </div>
    );
};

export default KanbanBoard;
