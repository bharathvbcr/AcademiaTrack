import { useState, useMemo } from 'react';
import { Application, ApplicationStatus, ProgramType } from '../types';

export type SortKey = 'deadline' | 'universityName' | 'status';

export interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

export interface FilterState {
  status: ApplicationStatus | 'all';
  programType: ProgramType | 'all';
  deadlineRange: 'all' | 'week' | 'month' | 'overdue';
  tags: string[];
  feeMax: number | null;
}

const defaultFilters: FilterState = {
  status: 'all',
  programType: 'all',
  deadlineRange: 'all',
  tags: [],
  feeMax: null,
};

export const useSortAndFilter = (applications: Application[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
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
    const query = searchQuery.toLowerCase();

    // Enhanced search: includes faculty names, notes, location
    const filtered = applications.filter(app => {
      // Text search
      const textMatch = !query ||
        app.universityName.toLowerCase().includes(query) ||
        app.programName.toLowerCase().includes(query) ||
        app.location?.toLowerCase().includes(query) ||
        app.notes?.toLowerCase().includes(query) ||
        app.facultyContacts?.some(f =>
          f.name.toLowerCase().includes(query) ||
          f.researchArea?.toLowerCase().includes(query)
        );

      if (!textMatch) return false;

      // Status filter
      if (filters.status !== 'all' && app.status !== filters.status) return false;

      // Program type filter
      if (filters.programType !== 'all' && app.programType !== filters.programType) return false;

      // Tag filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => app.tags?.includes(tag))) return false;

      // Fee filter
      if (filters.feeMax !== null && app.applicationFee > filters.feeMax) return false;

      // Deadline range filter
      if (filters.deadlineRange !== 'all' && app.deadline) {
        const deadline = new Date(app.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (filters.deadlineRange === 'overdue' && diffDays >= 0) return false;
        if (filters.deadlineRange === 'week' && (diffDays < 0 || diffDays > 7)) return false;
        if (filters.deadlineRange === 'month' && (diffDays < 0 || diffDays > 30)) return false;
      } else if (filters.deadlineRange !== 'all' && !app.deadline) {
        return false; // No deadline set, doesn't match deadline filters
      }

      return true;
    });

    const sortableItems = [...filtered];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        // Pinned items always come first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

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
  }, [applications, sortConfig, searchQuery, filters]);

  const hasActiveFilters = filters.status !== 'all' ||
    filters.programType !== 'all' ||
    filters.deadlineRange !== 'all' ||
    filters.tags.length > 0 ||
    filters.feeMax !== null ||
    searchQuery.length > 0;

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortConfig,
    requestSort,
    filteredAndSortedApplications,
    hasActiveFilters,
  };
};
