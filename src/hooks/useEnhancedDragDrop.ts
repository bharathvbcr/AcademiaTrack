import { useState, useCallback } from 'react';
import { Application, ApplicationStatus } from '../types';
import { DropResult } from '@hello-pangea/dnd';

export interface DragOperation {
  type: 'status' | 'tag' | 'export' | 'duplicate';
  target: string;
  applications: Application[];
}

export const useEnhancedDragDrop = (
  applications: Application[],
  onUpdate: (app: Application) => void,
  onBulkUpdate?: (updates: Partial<Application>, ids: string[]) => void,
  onAddTag?: (tag: string, ids: string[]) => void,
  onExport?: (apps: Application[]) => void
) => {
  const [draggedItems, setDraggedItems] = useState<Set<string>>(new Set());
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  const handleDragStart = useCallback((draggableId: string) => {
    setDraggedItems(new Set([draggableId]));
  }, []);

  const handleMultiDragStart = useCallback((ids: string[]) => {
    setDraggedItems(new Set(ids));
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      setDraggedItems(new Set());
      setDragTarget(null);
      return;
    }

    // Handle status change drag
    if (destination.droppableId !== source.droppableId) {
      const app = applications.find(a => a.id === draggableId);
      if (app) {
        onUpdate({
          ...app,
          status: destination.droppableId as ApplicationStatus,
        });
      }
    }

    // Handle multi-item drag
    if (draggedItems.size > 1) {
      const draggedApps = applications.filter(a => draggedItems.has(a.id));
      if (destination.droppableId !== source.droppableId && onBulkUpdate) {
        onBulkUpdate(
          { status: destination.droppableId as ApplicationStatus },
          Array.from(draggedItems)
        );
      }
    }

    setDraggedItems(new Set());
    setDragTarget(null);
  }, [applications, onUpdate, onBulkUpdate, draggedItems]);

  const handleDragToTag = useCallback((tag: string, applicationIds: string[]) => {
    if (onAddTag) {
      onAddTag(tag, applicationIds);
    }
    setDraggedItems(new Set());
  }, [onAddTag]);

  const handleDragToExport = useCallback((applicationIds: string[]) => {
    if (onExport) {
      const apps = applications.filter(a => applicationIds.includes(a.id));
      onExport(apps);
    }
    setDraggedItems(new Set());
  }, [applications, onExport]);

  const isDragging = draggedItems.size > 0;

  return {
    draggedItems,
    dragTarget,
    isDragging,
    handleDragStart,
    handleMultiDragStart,
    handleDragEnd,
    handleDragToTag,
    handleDragToExport,
    setDragTarget,
  };
};
