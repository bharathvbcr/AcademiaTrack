import React, { useMemo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Application, ApplicationStatus } from '../types';
import KanbanCard from './KanbanCard';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { KanbanStatusConfig } from '../hooks/useKanbanConfig';
import VirtualizedList from './VirtualizedList';

interface KanbanColumnProps {
    status: ApplicationStatus;
    applications: Application[];
    onEdit: (app: Application) => void;
    onUpdate?: (app: Application) => void;
    onDuplicate: (id: string) => void;
    statusConfig?: KanbanStatusConfig;
}

const KanbanColumn: React.FC<KanbanColumnProps> = React.memo(({ status, applications, onEdit, onUpdate, onDuplicate, statusConfig }) => {
    // Use statusConfig if provided, otherwise fallback to defaults
    const statusName = statusConfig?.name || STATUS_LABELS[status] || status;
    const statusColor = statusConfig?.color || STATUS_COLORS[status] || 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600';

    // Enable virtual scrolling for columns with many cards (100+)
    const useVirtualScrolling = useMemo(() => applications.length > 100, [applications.length]);

    return (
        <div className="flex flex-col w-72 shrink-0 max-h-full">
            <div className={`flex items-center justify-between mb-3 px-2 py-1 rounded-lg liquid-glass ${statusColor} bg-opacity-20`}>
                <h3 className="font-bold text-[#F5D7DA] text-sm">{statusName}</h3>
                <span className="text-xs font-semibold bg-[rgba(139,0,0,0.5)] backdrop-blur-sm px-2 py-0.5 rounded-full text-[#E8B4B8]">
                    {applications.length}
                </span>
            </div>

            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto custom-scrollbar rounded-xl p-2 transition-colors min-h-[150px] max-h-[calc(100vh-280px)] liquid-glass ${snapshot.isDraggingOver ? 'bg-[rgba(139,0,0,0.5)]' : ''
                            }`}
                    >
                        {useVirtualScrolling ? (
                            <VirtualizedList
                                items={applications}
                                itemHeight={120} // Approximate height of a Kanban card
                                layout="list"
                                overscan={3}
                                renderItem={(app, index) => (
                                    <KanbanCard
                                        key={app.id}
                                        application={app}
                                        index={index}
                                        onEdit={onEdit}
                                        onUpdate={onUpdate}
                                        onDuplicate={onDuplicate}
                                    />
                                )}
                            />
                        ) : (
                            applications.map((app, index) => (
                                <KanbanCard
                                    key={app.id}
                                    application={app}
                                    index={index}
                                    onEdit={onEdit}
                                    onUpdate={onUpdate}
                                    onDuplicate={onDuplicate}
                                />
                            ))
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison - only re-render if applications array changes
    return (
        prevProps.status === nextProps.status &&
        prevProps.applications.length === nextProps.applications.length &&
        prevProps.applications.every((app, idx) => 
            nextProps.applications[idx]?.id === app.id &&
            nextProps.applications[idx]?.status === app.status
        ) &&
        prevProps.statusConfig?.id === nextProps.statusConfig?.id
    );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
