import React from 'react';

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


const ListControls: React.FC<ListControlsProps> = ({ sortConfig, requestSort, searchQuery, onSearchChange }) => {
  return (
    <div className="mb-8 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center flex-wrap gap-4">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sort by:</span>
            <div className="flex items-center gap-2">
                <SortChip label="Deadline" sortKey="deadline" sortConfig={sortConfig} requestSort={requestSort} />
                <SortChip label="University" sortKey="universityName" sortConfig={sortConfig} requestSort={requestSort} />
                <SortChip label="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
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
    </div>
  );
};

export default ListControls;