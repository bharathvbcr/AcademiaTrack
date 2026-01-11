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

const KanbanCard: React.FC<KanbanCardProps> = React.memo(({ application, index, onEdit, onUpdate, onDuplicate }) => {
  const deadlineDate = React.useMemo(() => 
    application.deadline ? new Date(application.deadline) : null,
    [application.deadline]
  );

  const handlePinClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      onUpdate({ ...application, isPinned: !application.isPinned });
    }
  }, [application, onUpdate]);

  return (
    <Draggable draggableId={application.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group liquid-glass-card p-3 rounded-xl mb-3 transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[#E8B4B8] rotate-2' : ''
            } ${application.isPinned ? 'border-[#E8B4B8]' : ''}`}
          onClick={() => onEdit(application)}
          style={provided.draggableProps.style}
        >
          <div className="flex items-start justify-between">
            <h4 className="font-bold text-[#F5D7DA] text-sm truncate flex-1">
              {application.isPinned && (
                <span className="text-[#E8B4B8] mr-1 inline-block align-text-bottom">
                  <span className="material-symbols-outlined text-sm">push_pin</span>
                </span>
              )}
              {application.universityName}
            </h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDuplicate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(application.id); }}
                  className="p-1 rounded-full text-[#E8B4B8] hover:text-[#F5D7DA] hover:bg-[rgba(192,48,80,0.2)]"
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
                    ? 'text-[#E8B4B8] opacity-100'
                    : 'text-[#E8B4B8]/60 hover:text-[#E8B4B8] hover:bg-[rgba(192,48,80,0.2)]'
                    }`}
                  title={application.isPinned ? 'Unpin' : 'Pin to top'}
                  aria-label={application.isPinned ? 'Unpin' : 'Pin to top'}
                >
                  <span className="material-symbols-outlined text-sm">push_pin</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-[#E8B4B8] truncate mb-2">
            {application.programName}
          </p>

          <div className="flex justify-between items-center text-xs gap-1">
            {application.tags && application.tags.length > 0 && (
              <span className="text-xs text-[#F5D7DA]" title={application.tags.join(', ')}>
                <span className="material-symbols-outlined text-xs">sell</span>
              </span>
            )}
            {deadlineDate ? (
              <DeadlineBadge deadline={application.deadline} />
            ) : (
              <span></span>
            )}
            <span className="material-symbols-outlined text-[#E8B4B8]/60 text-sm ml-auto">drag_indicator</span>
          </div>
        </div>
      )}
    </Draggable>
  );
}, (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
        prevProps.application.id === nextProps.application.id &&
        prevProps.application.status === nextProps.application.status &&
        prevProps.application.deadline === nextProps.application.deadline &&
        prevProps.application.isPinned === nextProps.application.isPinned &&
        prevProps.index === nextProps.index
    );
});

KanbanCard.displayName = 'KanbanCard';

export default KanbanCard;
