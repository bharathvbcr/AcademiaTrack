import { useReducer, useCallback } from 'react';

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

type State<T> = { past: T[]; present: T; future: T[] };
type Action<T> =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET'; payload: T | ((prev: T) => T) }
  | { type: 'RESET'; payload: T };

function undoRedoReducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next,
        future: state.future.slice(1),
      };
    }
    case 'SET': {
      const resolved = action.payload instanceof Function ? action.payload(state.present) : action.payload;
      if (resolved === state.present) return state;
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: resolved,
        future: [],
      };
    }
    case 'RESET':
      return { past: [], present: action.payload, future: [] };
    default:
      return state;
  }
}

export const useUndoRedo = <T>(initialState: T): UndoRedoResult<T> => {
    const [{ past, present, future }, dispatch] = useReducer(
        undoRedoReducer as (state: State<T>, action: Action<T>) => State<T>,
        { past: [], present: initialState, future: [] }
    );

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);

    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

    const setState = useCallback((newState: T | ((prevState: T) => T)) => {
        dispatch({ type: 'SET', payload: newState });
    }, []);

    const reset = useCallback((newState: T) => {
        dispatch({ type: 'RESET', payload: newState });
    }, []);

    return { state: present, setState, undo, redo, canUndo, canRedo, reset };
};
