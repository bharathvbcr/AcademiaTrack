import React, { useState } from 'react';
import { useViewPresets } from '../hooks/useViewPresets';

type SortKey = 'deadline' | 'universityName' | 'status';

interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

interface ListControlsProps {
  sortConfig: SortConfig;
  requestSort: (key: SortKey) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilterId?: string | null;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const SortChip: React.FC<{
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig;
  requestSort: (key: SortKey) => void;
}> = ({ label, sortKey, sortConfig, requestSort }) => {
  const isActive = sortConfig.key === sortKey;
  const buttonClasses = `flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-white dark:focus:ring-offset-slate-800 ${
    isActive
      ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-200'
      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
  }`;

  return (
    <button onClick={() => requestSort(sortKey)} className={buttonClasses}>
      {isActive && <MaterialIcon name={sortConfig.direction === 'ascending' ? 'arrow_upward' : 'arrow_downward'} className="text-sm" />}
      <span>{label}</span>
    </button>
  );
};


const ListControls: React.FC<ListControlsProps> = ({ sortConfig, requestSort, searchQuery, onSearchChange, activeFilterId }) => {
  const { presets, activePreset, activatePreset, createPreset } = useViewPresets();
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    createPreset(
      presetName,
      `Sort: ${sortConfig.key} ${sortConfig.direction}`,
      [], // Columns not applicable for card view
      { key: sortConfig.key, direction: sortConfig.direction === 'ascending' ? 'asc' : 'desc' },
      activeFilterId || undefined
    );
    setPresetName('');
    setShowSavePreset(false);
  };

  const handlePresetSelect = (presetId: string) => {
    activatePreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset?.sortConfig) {
      // Apply sort from preset
      if (sortConfig.key !== preset.sortConfig.key) {
        requestSort(preset.sortConfig.key as SortKey);
      }
    }
    setShowPresetMenu(false);
  };

  return (
    <div className="mb-8 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center flex-wrap gap-4">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sort by:</span>
            <div className="flex items-center gap-2">
                <SortChip label="Deadline" sortKey="deadline" sortConfig={sortConfig} requestSort={requestSort} />
                <SortChip label="University" sortKey="universityName" sortConfig={sortConfig} requestSort={requestSort} />
                <SortChip label="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
            </div>
            
            {/* View Preset Selector */}
            <div className="relative">
              <button
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                <MaterialIcon name="view_module" className="text-sm" />
                {activePreset ? activePreset.name : 'View Preset'}
                <MaterialIcon name="arrow_drop_down" className="text-sm" />
              </button>
              
              {showPresetMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                  <div className="p-2">
                    {presets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                          activePreset?.id === preset.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowSavePreset(true);
                          setShowPresetMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <MaterialIcon name="add" className="text-sm" />
                        Save Current View
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MaterialIcon name="search" className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full sm:w-64 rounded-full border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 py-2 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-white dark:focus:ring-offset-slate-800"
            aria-label="Search applications"
          />
        </div>
        
        {/* Save Preset Dialog */}
        {showSavePreset && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-20">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm mb-2"
              autoFocus
              aria-label="Preset name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePreset();
                } else if (e.key === 'Escape') {
                  setShowSavePreset(false);
                  setPresetName('');
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSavePreset}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSavePreset(false);
                  setPresetName('');
                }}
                className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default ListControls;