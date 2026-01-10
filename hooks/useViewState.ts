import { useLocalStorage } from './useLocalStorage';
import { SortConfig, SortKey } from './useSortAndFilter';
import { FilterState } from './useSortAndFilter';

export type ViewMode = 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline';

export interface ViewState {
  sortConfig: SortConfig;
  filters: FilterState;
  searchQuery: string;
  columnWidths?: { [key: string]: number };
  visibleColumns?: string[];
}

export const useViewState = (viewMode: ViewMode) => {
  const [viewStates, setViewStates] = useLocalStorage<{ [key in ViewMode]?: ViewState }>('view-states', {});

  const getViewState = (): ViewState | undefined => {
    return viewStates[viewMode];
  };

  const saveViewState = (state: Partial<ViewState>) => {
    setViewStates(prev => ({
      ...prev,
      [viewMode]: {
        ...prev[viewMode],
        ...state,
      } as ViewState,
    }));
  };

  const resetViewState = () => {
    setViewStates(prev => {
      const newStates = { ...prev };
      delete newStates[viewMode];
      return newStates;
    });
  };

  return {
    getViewState,
    saveViewState,
    resetViewState,
  };
};
