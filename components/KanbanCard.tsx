import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Application } from '../types';

interface KanbanCardProps {
  application: Application;
  index: number;
  onEdit: (app: Application) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ application, index, onEdit }) => {
  const deadlineDate = application.deadline ? new Date(application.deadline) : null;

  return (
    <Draggable draggableId={application.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-3 transition-shadow hover:shadow-md ${snapshot.isDragging ? 'shadow-lg ring-2 ring-red-500 rotate-2' : ''
            }`}
          onClick={() => onEdit(application)}
          style={provided.draggableProps.style}
        >
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
            {application.universityName}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
            {application.programName}
          </p>

          <div className="flex justify-between items-center text-xs">
            {deadlineDate ? (
              <span className={`px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`}>
                {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            ) : (
              <span></span>
            )}
            <span className="material-symbols-outlined text-slate-400 text-sm">drag_indicator</span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
