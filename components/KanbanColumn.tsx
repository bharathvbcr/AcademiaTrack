import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Application, ApplicationStatus } from '../types';
import KanbanCard from './KanbanCard';
import { STATUS_COLORS } from '../constants';

interface KanbanColumnProps {
    status: ApplicationStatus;
    applications: Application[];
    onEdit: (app: Application) => void;
    onUpdate?: (app: Application) => void;
    onDuplicate: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, applications, onEdit, onUpdate, onDuplicate }) => {
    return (
        <div className="flex flex-col w-72 shrink-0 max-h-full">
            <div className={`flex items-center justify-between mb-3 px-2 py-1 rounded-lg ${STATUS_COLORS[status]} bg-opacity-20`}>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{status}</h3>
                <span className="text-xs font-semibold bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                    {applications.length}
                </span>
            </div>

            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto custom-scrollbar rounded-xl p-2 transition-colors min-h-[150px] max-h-[calc(100vh-280px)] ${snapshot.isDraggingOver ? 'bg-slate-100/50 dark:bg-slate-800/50' : ''
                            }`}
                    >
                        {applications.map((app, index) => (
                            <KanbanCard
                                key={app.id}
                                application={app}
                                index={index}
                                onEdit={onEdit}
                                onUpdate={onUpdate}
                                onDuplicate={onDuplicate}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default KanbanColumn;
