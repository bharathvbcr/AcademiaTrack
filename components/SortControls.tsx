import React from 'react';
import { MaterialIcon } from './ApplicationFormUI';

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
}

const SortChip: React.FC<{
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig;
  requestSort: (key: SortKey) => void;
}> = ({ label, sortKey, sortConfig, requestSort }) => {
  const isActive = sortConfig.key === sortKey;
  const buttonClasses = `flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b] ${
    isActive
      ? 'bg-[#dc2626]/20 text-[#fca5a5] border border-[#dc2626]/30'
      : 'bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:bg-[#27272a] hover:text-[#f4f4f5]'
  }`;

  return (
    <button
      onClick={() => requestSort(sortKey)}
      aria-pressed={isActive}
      aria-label={isActive ? `Sort by ${label}, ${sortConfig.direction}` : `Sort by ${label}`}
      className={buttonClasses}
    >
      {isActive && <MaterialIcon name={sortConfig.direction === 'ascending' ? 'arrow_upward' : 'arrow_downward'} className="text-sm" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
};


const ListControls: React.FC<ListControlsProps> = ({ sortConfig, requestSort, searchQuery, onSearchChange }) => {
  return (
    <div className="mb-6 p-3.5 liquid-glass-card rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center flex-wrap gap-3">
            <span className="text-sm font-medium text-[#a1a1aa]">Sort by</span>
            <div className="flex items-center gap-2">
                <SortChip label="Deadline" sortKey="deadline" sortConfig={sortConfig} requestSort={requestSort} />
                <SortChip label="University" sortKey="universityName" sortConfig={sortConfig} requestSort={requestSort} />
                <SortChip label="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
            </div>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MaterialIcon name="search" className="text-[#a1a1aa] text-base" />
          </div>
          <input
            type="text"
            placeholder="Filter list…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full sm:w-56 rounded-xl border border-[#27272a] bg-[#09090b] py-2 pl-9 pr-3 text-sm text-[#f4f4f5] placeholder:text-[#a1a1aa]/50 focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
            aria-label="Filter applications in list"
          />
        </div>
    </div>
  );
};

export default ListControls;
