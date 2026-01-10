import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Application } from '../types';

interface VirtualizedKanbanColumnProps {
  droppableId: string;
  applications: Application[];
  renderCard: (app: Application, index: number) => React.ReactNode;
  itemHeight?: number;
  overscan?: number;
  isDraggingOver?: boolean;
}

const VirtualizedKanbanColumn: React.FC<VirtualizedKanbanColumnProps> = ({
  droppableId,
  applications,
  renderCard,
  itemHeight = 180, // Approximate Kanban card height
  overscan = 3,
  isDraggingOver = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const totalHeight = applications.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    applications.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (applications[i]) {
        items.push({ app: applications[i], index: i });
      }
    }
    return items;
  }, [applications, startIndex, endIndex]);

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={(el) => {
            provided.innerRef(el);
            if (el) {
              // Store ref for scroll tracking
              (containerRef as any).current = el;
            }
          }}
          {...provided.droppableProps}
          className={`flex-1 overflow-y-auto custom-scrollbar rounded-xl p-2 transition-colors min-h-[150px] max-h-[calc(100vh-280px)] ${
            snapshot.isDraggingOver || isDraggingOver ? 'bg-slate-100/50 dark:bg-slate-800/50' : ''
          }`}
          style={{ position: 'relative' }}
          onScroll={(e) => {
            const target = e.currentTarget;
            setScrollTop(target.scrollTop);
          }}
        >
          {/* Spacer for items before visible range */}
          {startIndex > 0 && (
            <div style={{ height: startIndex * itemHeight }} aria-hidden="true" />
          )}

          {/* Render visible items */}
          <div style={{ position: 'relative' }}>
            {visibleItems.map(({ app, index }) => (
              <div
                key={app.id}
                style={{
                  height: itemHeight,
                  marginBottom: index < applications.length - 1 ? 8 : 0,
                }}
              >
                {renderCard(app, index)}
              </div>
            ))}
          </div>

          {/* Spacer for items after visible range */}
          {endIndex < applications.length - 1 && (
            <div style={{ height: (applications.length - endIndex - 1) * itemHeight }} aria-hidden="true" />
          )}

          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default VirtualizedKanbanColumn;
