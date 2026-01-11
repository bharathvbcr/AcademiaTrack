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
  columnOrder?: string[];
}

export interface ViewPreset {
  id: string;
  name: string;
  viewMode: ViewMode;
  state: ViewState;
  createdAt: number;
  updatedAt: number;
}

export const useViewState = (viewMode: ViewMode) => {
  const [viewStates, setViewStates] = useLocalStorage<{ [key in ViewMode]?: ViewState }>('view-states', {});
  const [viewPresets, setViewPresets] = useLocalStorage<ViewPreset[]>('view-presets', []);

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

  const savePreset = (name: string, state: ViewState): string => {
    const preset: ViewPreset = {
      id: crypto.randomUUID(),
      name,
      viewMode,
      state,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setViewPresets(prev => [...prev, preset]);
    return preset.id;
  };

  const loadPreset = (presetId: string): boolean => {
    const preset = viewPresets.find(p => p.id === presetId);
    if (preset && preset.viewMode === viewMode) {
      saveViewState(preset.state);
      return true;
    }
    return false;
  };

  const deletePreset = (presetId: string) => {
    setViewPresets(prev => prev.filter(p => p.id !== presetId));
  };

  const updatePreset = (presetId: string, updates: Partial<ViewPreset>) => {
    setViewPresets(prev => prev.map(p => 
      p.id === presetId ? { ...p, ...updates, updatedAt: Date.now() } : p
    ));
  };

  const getPresetsForView = (): ViewPreset[] => {
    return viewPresets.filter(p => p.viewMode === viewMode);
  };

  return {
    getViewState,
    saveViewState,
    resetViewState,
    savePreset,
    loadPreset,
    deletePreset,
    updatePreset,
    getPresetsForView,
    allPresets: viewPresets,
  };
};
