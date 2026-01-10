import React, { useState, useMemo, useCallback } from 'react';
import { Application, ApplicationStatus, ProgramType, DocumentStatus } from '../types';
import { useLocalStorage } from './useLocalStorage';

export type FilterOperator = 'AND' | 'OR' | 'NOT';
export type FilterField = 
  | 'status' 
  | 'programType' 
  | 'deadline' 
  | 'tags' 
  | 'fee' 
  | 'universityName'
  | 'programName'
  | 'department'
  | 'location'
  | 'documentStatus'
  | 'facultyContactStatus'
  | 'recommenderStatus'
  | 'hasFinancialOffer'
  | 'admissionChance'
  | 'isR1';

export type FilterCondition = {
  field: FilterField;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn' | 'between';
  value: any;
};

export type FilterGroup = {
  id: string;
  operator: FilterOperator;
  conditions: FilterCondition[];
  groups?: FilterGroup[];
};

export type SavedFilter = {
  id: string;
  name: string;
  filter: FilterGroup;
  createdAt: string;
  lastUsed?: string;
};

export const useAdvancedFilter = (applications: Application[]) => {
  const [savedFilters, setSavedFilters] = useLocalStorage<SavedFilter[]>('saved-filters', []);
  const [activeFilterId, setActiveFilterId] = useLocalStorage<string | null>('active-filter-id', null);
  const [activeFilter, setActiveFilterState] = useState<FilterGroup | null>(null);

  // Restore active filter on mount
  React.useEffect(() => {
    if (activeFilterId) {
      const filter = savedFilters.find(f => f.id === activeFilterId);
      if (filter) {
        setActiveFilterState(filter.filter);
      } else {
        // Filter was deleted, clear active filter ID
        setActiveFilterId(null);
      }
    }
  }, []); // Only on mount

  const setActiveFilter = React.useCallback((filter: FilterGroup | null) => {
    setActiveFilterState(filter);
    // Clear active filter ID if filter is cleared
    if (!filter) {
      setActiveFilterId(null);
    }
  }, [setActiveFilterId]);

  const evaluateCondition = useCallback((app: Application, condition: FilterCondition): boolean => {
    const { field, operator, value } = condition;

    switch (field) {
      case 'status':
        if (operator === 'equals') return app.status === value;
        if (operator === 'in') return Array.isArray(value) && value.includes(app.status);
        if (operator === 'notIn') return Array.isArray(value) && !value.includes(app.status);
        break;
      
      case 'programType':
        if (operator === 'equals') return app.programType === value;
        if (operator === 'in') return Array.isArray(value) && value.includes(app.programType);
        break;
      
      case 'deadline':
        if (!app.deadline) return operator === 'equals' && value === null;
        const deadline = new Date(app.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (operator === 'lessThan') return diffDays < value;
        if (operator === 'greaterThan') return diffDays > value;
        if (operator === 'between') {
          const [min, max] = value;
          return diffDays >= min && diffDays <= max;
        }
        break;
      
      case 'tags':
        if (operator === 'contains') return app.tags?.includes(value) || false;
        if (operator === 'in') {
          return Array.isArray(value) && value.some(tag => app.tags?.includes(tag));
        }
        break;
      
      case 'fee':
        if (operator === 'lessThan') return app.applicationFee < value;
        if (operator === 'greaterThan') return app.applicationFee > value;
        if (operator === 'between') {
          const [min, max] = value;
          return app.applicationFee >= min && app.applicationFee <= max;
        }
        break;
      
      case 'universityName':
      case 'programName':
      case 'department':
      case 'location':
        const fieldValue = app[field]?.toLowerCase() || '';
        const searchValue = String(value).toLowerCase();
        if (operator === 'contains') return fieldValue.includes(searchValue);
        if (operator === 'equals') return fieldValue === searchValue;
        break;
      
      case 'documentStatus':
        const docType = value.type; // e.g., 'cv', 'statementOfPurpose'
        const docStatus = value.status as DocumentStatus;
        const doc = app.documents[docType as keyof typeof app.documents];
        if (!doc) return false;
        if (operator === 'equals') return doc.status === docStatus;
        if (operator === 'in') return Array.isArray(docStatus) && docStatus.includes(doc.status);
        break;
      
      case 'facultyContactStatus':
        if (operator === 'equals') {
          return app.facultyContacts?.some(f => f.contactStatus === value) || false;
        }
        if (operator === 'in') {
          return app.facultyContacts?.some(f => Array.isArray(value) && value.includes(f.contactStatus)) || false;
        }
        break;
      
      case 'recommenderStatus':
        if (operator === 'equals') {
          return app.recommenders?.some(r => r.status === value) || false;
        }
        if (operator === 'in') {
          return app.recommenders?.some(r => Array.isArray(value) && value.includes(r.status)) || false;
        }
        break;
      
      case 'hasFinancialOffer':
        if (operator === 'equals') return (app.financialOffer?.received || false) === value;
        break;
      
      case 'admissionChance':
        if (!app.admissionChance) return false;
        if (operator === 'greaterThan') return app.admissionChance > value;
        if (operator === 'lessThan') return app.admissionChance < value;
        if (operator === 'between') {
          const [min, max] = value;
          return app.admissionChance >= min && app.admissionChance <= max;
        }
        break;
      
      case 'isR1':
        if (operator === 'equals') return app.isR1 === value;
        break;
    }

    return false;
  }, []);

  const evaluateFilter = useCallback((app: Application, filter: FilterGroup): boolean => {
    const conditionResults = filter.conditions.map(cond => evaluateCondition(app, cond));
    const groupResults = filter.groups?.map(group => evaluateFilter(app, group)) || [];

    let results: boolean[];
    if (filter.operator === 'AND') {
      results = [...conditionResults, ...groupResults];
      return results.every(r => r);
    } else if (filter.operator === 'OR') {
      results = [...conditionResults, ...groupResults];
      return results.some(r => r);
    } else if (filter.operator === 'NOT') {
      results = [...conditionResults, ...groupResults];
      return !results.some(r => r);
    }

    return true;
  }, [evaluateCondition]);

  const filteredApplications = useMemo(() => {
    if (!activeFilter) return applications;
    return applications.filter(app => evaluateFilter(app, activeFilter));
  }, [applications, activeFilter, evaluateFilter]);

  const saveFilter = useCallback((name: string, filter: FilterGroup) => {
    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name,
      filter,
      createdAt: new Date().toISOString(),
    };
    setSavedFilters(prev => [...prev, newFilter]);
    return newFilter.id;
  }, [setSavedFilters]);

  const loadFilter = useCallback((id: string) => {
    const filter = savedFilters.find(f => f.id === id);
    if (filter) {
      setActiveFilter(filter.filter);
      setActiveFilterId(id); // Persist active filter ID
      // Update last used
      setSavedFilters(prev => prev.map(f => 
        f.id === id ? { ...f, lastUsed: new Date().toISOString() } : f
      ));
      return filter;
    }
    return null;
  }, [savedFilters, setSavedFilters, setActiveFilterId]);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  }, [setSavedFilters]);

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
  }, []);

  return {
    activeFilter,
    setActiveFilter,
    filteredApplications,
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    clearFilter,
    evaluateCondition,
    evaluateFilter,
  };
};
