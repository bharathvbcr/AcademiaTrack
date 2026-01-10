import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Application } from '../types';
import { getDeadlineInfo } from '../constants';

const DeadlineBadge: React.FC<{ deadline: string | null }> = ({ deadline }) => {
  const info = getDeadlineInfo(deadline);
  if (info.urgency === 'none') return null;
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${info.colorClass}`}>
      {info.label}
    </span>
  );
};
interface KanbanCardProps {
  application: Application;
  index: number;
  onEdit: (app: Application) => void;
  onUpdate?: (app: Application) => void;
  onDuplicate?: (id: string) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ application, index, onEdit, onUpdate, onDuplicate }) => {
  const deadlineDate = application.deadline ? new Date(application.deadline) : null;

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      onUpdate({ ...application, isPinned: !application.isPinned });
    }
  };

  return (
    <Draggable draggableId={application.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border mb-3 transition-shadow hover:shadow-md ${snapshot.isDragging ? 'shadow-lg ring-2 ring-red-500 rotate-2' : ''
            } ${application.isPinned ? 'border-amber-400 dark:border-amber-500' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => onEdit(application)}
          style={provided.draggableProps.style}
        >
          <div className="flex items-start justify-between">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate flex-1">
              {application.isPinned && (
                <span className="text-amber-500 dark:text-amber-400 mr-1 inline-block align-text-bottom">
                  <span className="material-symbols-outlined text-sm">push_pin</span>
                </span>
              )}
              {application.universityName}
            </h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDuplicate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(application.id); }}
                  className="p-1 rounded-full text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                  title="Duplicate"
                  aria-label="Duplicate application"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              )}
              {onUpdate && (
                <button
                  onClick={handlePinClick}
                  className={`p-1 rounded-full transition-colors ${application.isPinned
                    ? 'text-amber-500 dark:text-amber-400 opacity-100'
                    : 'text-slate-400 hover:text-amber-500 dark:hover:text-amber-400'
                    }`}
                  title={application.isPinned ? 'Unpin' : 'Pin to top'}
                  aria-label={application.isPinned ? 'Unpin' : 'Pin to top'}
                >
                  <span className="material-symbols-outlined text-sm">push_pin</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
            {application.programName}
          </p>

          <div className="flex justify-between items-center text-xs gap-1">
            {application.tags && application.tags.length > 0 && (
              <span className="text-xs text-pink-500 dark:text-pink-400" title={application.tags.join(', ')}>
                <span className="material-symbols-outlined text-xs">sell</span>
              </span>
            )}
            {deadlineDate ? (
              <DeadlineBadge deadline={application.deadline} />
            ) : (
              <span></span>
            )}
            <span className="material-symbols-outlined text-slate-400 text-sm ml-auto">drag_indicator</span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default React.memo(KanbanCard);
