import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface ViewPreset {
  id: string;
  name: string;
  description?: string;
  columns: string[]; // Array of column IDs to show
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  filterId?: string; // Optional linked filter
  createdAt: string;
  lastUsed?: string;
}

const DEFAULT_PRESETS: ViewPreset[] = [
  {
    id: 'all',
    name: 'All Columns',
    description: 'Show all available columns',
    columns: ['university', 'program', 'status', 'deadline', 'fee', 'department', 'location', 'tags'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'basic',
    name: 'Basic View',
    description: 'Essential information only',
    columns: ['university', 'program', 'status', 'deadline'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'financial',
    name: 'Financial View',
    description: 'Focus on fees and financial offers',
    columns: ['university', 'program', 'fee', 'financialOffer', 'scholarships'],
    createdAt: new Date().toISOString(),
  },
];

export const useViewPresets = () => {
  const [presets, setPresets] = useLocalStorage<ViewPreset[]>('view-presets', DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useLocalStorage<string | null>('active-view-preset', null);

  const getActivePreset = useCallback((): ViewPreset | null => {
    if (!activePresetId) return null;
    return presets.find(p => p.id === activePresetId) || null;
  }, [presets, activePresetId]);

  const createPreset = useCallback((name: string, description: string, columns: string[], sortConfig?: ViewPreset['sortConfig'], filterId?: string) => {
    const newPreset: ViewPreset = {
      id: crypto.randomUUID(),
      name,
      description,
      columns,
      sortConfig,
      filterId,
      createdAt: new Date().toISOString(),
    };
    setPresets(prev => [...prev, newPreset]);
    return newPreset.id;
  }, [setPresets]);

  const updatePreset = useCallback((id: string, updates: Partial<ViewPreset>) => {
    setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [setPresets]);

  const deletePreset = useCallback((id: string) => {
    // Don't allow deleting default presets
    if (DEFAULT_PRESETS.some(p => p.id === id)) return;
    setPresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  }, [setPresets, activePresetId, setActivePresetId]);

  const activatePreset = useCallback((id: string) => {
    setActivePresetId(id);
    // Update last used
    setPresets(prev => prev.map(p => 
      p.id === id ? { ...p, lastUsed: new Date().toISOString() } : p
    ));
  }, [setActivePresetId, setPresets]);

  const deactivatePreset = useCallback(() => {
    setActivePresetId(null);
  }, [setActivePresetId]);

  return {
    presets,
    activePreset: getActivePreset(),
    activePresetId,
    createPreset,
    updatePreset,
    deletePreset,
    activatePreset,
    deactivatePreset,
  };
};
