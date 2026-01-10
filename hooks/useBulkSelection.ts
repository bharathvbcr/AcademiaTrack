import { useState, useCallback } from 'react';
import { Application, ApplicationStatus } from '../types';

export interface BulkSelectionState {
    selectedIds: Set<string>;
    isSelectionMode: boolean;
}

export const useBulkSelection = (applications: Application[]) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const toggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => {
            if (prev) {
                // Exiting selection mode - clear selections
                setSelectedIds(new Set());
            }
            return !prev;
        });
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(applications.map(app => app.id)));
    }, [applications]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isSelected = useCallback((id: string) => {
        return selectedIds.has(id);
    }, [selectedIds]);

    const selectedCount = selectedIds.size;

    const getSelectedApplications = useCallback(() => {
        return applications.filter(app => selectedIds.has(app.id));
    }, [applications, selectedIds]);

    return {
        selectedIds,
        isSelectionMode,
        selectedCount,
        toggleSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
        getSelectedApplications,
    };
};
