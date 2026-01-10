import { useState, useCallback, useEffect, useRef } from 'react';
import { Application, ApplicationStatus } from '../types';

export interface BulkSelectionState {
    selectedIds: Set<string>;
    isSelectionMode: boolean;
}

export const useBulkSelection = (applications: Application[]) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const lastClickedIndexRef = useRef<number | null>(null);

    const toggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => {
            if (prev) {
                // Exiting selection mode - clear selections
                setSelectedIds(new Set());
            }
            return !prev;
        });
    }, []);

    const toggleSelection = useCallback((id: string, index?: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
        if (index !== undefined) {
            lastClickedIndexRef.current = index;
            setFocusedIndex(index);
        }
    }, []);

    // Handle range selection (Shift+Click)
    const selectRange = useCallback((endIndex: number) => {
        if (lastClickedIndexRef.current === null) {
            toggleSelection(applications[endIndex].id, endIndex);
            return;
        }

        const startIndex = lastClickedIndexRef.current;
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);

        setSelectedIds(prev => {
            const newSet = new Set(prev);
            for (let i = minIndex; i <= maxIndex; i++) {
                if (applications[i]) {
                    newSet.add(applications[i].id);
                }
            }
            return newSet;
        });
        setFocusedIndex(endIndex);
    }, [applications, toggleSelection]);

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

    // Keyboard navigation handlers
    const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
        if (!isSelectionMode) return;

        // Cmd/Ctrl+A: Select all visible applications
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
            e.preventDefault();
            selectAll();
            return;
        }

        // Arrow keys + Space: Navigate and toggle selection
        if (focusedIndex !== null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();

            if (e.key === ' ') {
                // Toggle selection of focused item
                if (applications[focusedIndex]) {
                    toggleSelection(applications[focusedIndex].id, focusedIndex);
                }
                return;
            }

            let newIndex = focusedIndex;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                newIndex = Math.min(focusedIndex + 1, applications.length - 1);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                newIndex = Math.max(focusedIndex - 1, 0);
            }

            if (newIndex !== focusedIndex) {
                setFocusedIndex(newIndex);
                // Scroll into view if needed
                const element = document.querySelector(`[data-application-index="${newIndex}"]`);
                element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [isSelectionMode, focusedIndex, applications, toggleSelection, selectAll]);

    useEffect(() => {
        if (isSelectionMode) {
            window.addEventListener('keydown', handleKeyboardNavigation);
            return () => {
                window.removeEventListener('keydown', handleKeyboardNavigation);
            };
        }
    }, [isSelectionMode, handleKeyboardNavigation]);

    // Reset focused index when selection mode changes
    useEffect(() => {
        if (!isSelectionMode) {
            setFocusedIndex(null);
            lastClickedIndexRef.current = null;
        }
    }, [isSelectionMode]);

    return {
        selectedIds,
        isSelectionMode,
        selectedCount,
        toggleSelectionMode,
        toggleSelection,
        selectRange, // New: for Shift+Click range selection
        selectAll,
        clearSelection,
        isSelected,
        getSelectedApplications,
        focusedIndex, // Expose for UI highlighting
    };
};
