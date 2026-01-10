import { useState, useCallback } from 'react';

const MAX_HISTORY = 50;

export interface UndoRedoResult<T> {
    state: T;
    setState: (newState: T | ((prevState: T) => T)) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    reset: (newState: T) => void;
}

export const useUndoRedo = <T>(initialState: T): UndoRedoResult<T> => {
    const [past, setPast] = useState<T[]>([]);
    const [present, setPresent] = useState<T>(initialState);
    const [future, setFuture] = useState<T[]>([]);

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    const undo = useCallback(() => {
        if (!canUndo) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setPast(newPast);
        setPresent(previous);
        setFuture([present, ...future]);
    }, [past, present, future, canUndo]);

    const redo = useCallback(() => {
        if (!canRedo) return;

        const next = future[0];
        const newFuture = future.slice(1);

        setPast([...past, present]);
        setPresent(next);
        setFuture(newFuture);
    }, [past, present, future, canRedo]);

    const setState = useCallback((newState: T | ((prevState: T) => T)) => {
        setPresent((curr) => {
            const resolvedState = newState instanceof Function ? newState(curr) : newState;

            if (resolvedState === curr) return curr;

            setPast((prevPast) => {
                const newPast = [...prevPast, curr];
                if (newPast.length > MAX_HISTORY) {
                    return newPast.slice(newPast.length - MAX_HISTORY);
                }
                return newPast;
            });
            setFuture([]);

            return resolvedState;
        });
    }, []);

    const reset = useCallback((newState: T) => {
        setPresent(newState);
        setPast([]);
        setFuture([]);
    }, []);

    return { state: present, setState, undo, redo, canUndo, canRedo, reset };
};
