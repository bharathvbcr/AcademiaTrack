import { useState, useMemo } from 'react';
import { Application } from '../types';

export type SortKey = 'deadline' | 'universityName' | 'status';

export interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

export const useSortAndFilter = (applications: Application[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'deadline',
    direction: 'ascending',
  });

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedApplications = useMemo(() => {
    const filtered = applications.filter(app =>
      app.universityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.programName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortableItems = [...filtered];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        let comparison = 0;
        if (sortConfig.key === 'deadline') {
          // Treat null/empty deadlines as Infinity so they appear at the bottom when ascending
          const dateA = valA ? new Date(valA as string).getTime() : (sortConfig.direction === 'ascending' ? Infinity : -Infinity);
          const dateB = valB ? new Date(valB as string).getTime() : (sortConfig.direction === 'ascending' ? Infinity : -Infinity);
          comparison = dateA - dateB;
        } else {
          const strA = String(valA || '');
          const strB = String(valB || '');
          if (strA > strB) {
            comparison = 1;
          } else if (strA < strB) {
            comparison = -1;
          }
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [applications, sortConfig, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    sortConfig,
    requestSort,
    filteredAndSortedApplications,
  };
};
