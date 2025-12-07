import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Application, ApplicationStatus } from '../types';
import KanbanColumn from './KanbanColumn';
import { STATUS_OPTIONS } from '../constants';

interface KanbanBoardProps {
    applications: Application[];
    onDragEnd: (result: DropResult) => void;
    onEdit: (app: Application) => void;
    onUpdate?: (app: Application) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ applications, onDragEnd, onEdit, onUpdate }) => {
    // Group applications by status
    const applicationsByStatus = React.useMemo(() => {
        const grouped: Record<string, Application[]> = {};
        STATUS_OPTIONS.forEach(status => {
            grouped[status] = [];
        });
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
    }, [applications]);

    return (
        <div className="h-full min-h-[calc(100vh-200px)]">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-wrap justify-center gap-6 pb-8">
                    {STATUS_OPTIONS.map(status => (
                        <KanbanColumn
                            key={status}
                            status={status as ApplicationStatus}
                            applications={applicationsByStatus[status] || []}
                            onEdit={onEdit}
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default KanbanBoard;
