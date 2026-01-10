import { useState, useMemo, useCallback } from 'react';
import { Application } from '../types';
import { useLocalStorage } from './useLocalStorage';

export interface SearchQuery {
  id: string;
  name: string;
  query: string;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

export type SearchField = 
  | 'universityName'
  | 'programName'
  | 'department'
  | 'location'
  | 'status'
  | 'tags'
  | 'notes'
  | 'faculty'
  | 'recommender'
  | 'all';

export interface ParsedSearchQuery {
  field?: SearchField;
  operator?: 'contains' | 'equals' | 'startsWith' | 'endsWith';
  value: string;
  exclude?: boolean;
  fuzzy?: boolean;
}

export const useAdvancedSearch = (applications: Application[]) => {
  const [savedSearches, setSavedSearches] = useLocalStorage<SearchQuery[]>('saved-searches', []);
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('search-history', []);

  const parseQuery = useCallback((query: string): ParsedSearchQuery[] => {
    if (!query.trim()) return [];

    const parts: ParsedSearchQuery[] = [];
    const tokens = query.split(/\s+/);

    let currentPart: ParsedSearchQuery = { value: '' };
    
    tokens.forEach(token => {
      // Field-specific search: field:value
      if (token.includes(':')) {
        const [field, ...valueParts] = token.split(':');
        const value = valueParts.join(':');
        
        if (currentPart.value) {
          parts.push(currentPart);
        }
        
        currentPart = {
          field: field as SearchField,
          value: value,
          operator: 'contains',
        };
      }
      // Exclude operator: -value
      else if (token.startsWith('-')) {
        if (currentPart.value) {
          parts.push(currentPart);
        }
        currentPart = {
          value: token.substring(1),
          exclude: true,
          operator: 'contains',
        };
      }
      // Exact phrase: "value"
      else if (token.startsWith('"') && token.endsWith('"')) {
        if (currentPart.value) {
          parts.push(currentPart);
        }
        currentPart = {
          value: token.slice(1, -1),
          operator: 'equals',
        };
      }
      // Fuzzy search: ~value
      else if (token.startsWith('~')) {
        if (currentPart.value) {
          parts.push(currentPart);
        }
        currentPart = {
          value: token.substring(1),
          fuzzy: true,
          operator: 'contains',
        };
      }
      // Regular term
      else {
        if (currentPart.value) {
          currentPart.value += ' ' + token;
        } else {
          currentPart.value = token;
        }
      }
    });

    if (currentPart.value) {
      parts.push(currentPart);
    }

    return parts.length > 0 ? parts : [{ value: query, operator: 'contains' }];
  }, []);

  const matchesQuery = useCallback((app: Application, parsedQueries: ParsedSearchQuery[]): boolean => {
    return parsedQueries.every(part => {
      const { field, value, operator, exclude, fuzzy } = part;
      const lowerValue = value.toLowerCase();
      
      let matches = false;

      if (field && field !== 'all') {
        // Field-specific search
        switch (field) {
          case 'universityName':
            matches = searchInField(app.universityName, lowerValue, operator, fuzzy);
            break;
          case 'programName':
            matches = searchInField(app.programName, lowerValue, operator, fuzzy);
            break;
          case 'department':
            matches = searchInField(app.department, lowerValue, operator, fuzzy);
            break;
          case 'location':
            matches = searchInField(app.location, lowerValue, operator, fuzzy);
            break;
          case 'status':
            matches = searchInField(app.status, lowerValue, operator, fuzzy);
            break;
          case 'tags':
            matches = app.tags?.some(tag => searchInField(tag, lowerValue, operator, fuzzy)) || false;
            break;
          case 'notes':
            matches = searchInField(app.notes, lowerValue, operator, fuzzy);
            break;
          case 'faculty':
            matches = app.facultyContacts?.some(f => 
              searchInField(f.name, lowerValue, operator, fuzzy) ||
              searchInField(f.researchArea, lowerValue, operator, fuzzy)
            ) || false;
            break;
          case 'recommender':
            matches = app.recommenders?.some(r => 
              searchInField(r.name, lowerValue, operator, fuzzy)
            ) || false;
            break;
        }
      } else {
        // Search all fields
        matches = 
          searchInField(app.universityName, lowerValue, operator, fuzzy) ||
          searchInField(app.programName, lowerValue, operator, fuzzy) ||
          searchInField(app.department, lowerValue, operator, fuzzy) ||
          searchInField(app.location, lowerValue, operator, fuzzy) ||
          searchInField(app.notes, lowerValue, operator, fuzzy) ||
          app.tags?.some(tag => searchInField(tag, lowerValue, operator, fuzzy)) ||
          app.facultyContacts?.some(f => 
            searchInField(f.name, lowerValue, operator, fuzzy) ||
            searchInField(f.researchArea, lowerValue, operator, fuzzy)
          ) ||
          false;
      }

      return exclude ? !matches : matches;
    });
  }, []);

  const searchInField = (
    fieldValue: string | null | undefined,
    searchValue: string,
    operator: ParsedSearchQuery['operator'] = 'contains',
    fuzzy?: boolean
  ): boolean => {
    if (!fieldValue) return false;
    const lowerField = fieldValue.toLowerCase();

    if (fuzzy) {
      // Simple fuzzy matching (Levenshtein-like)
      return lowerField.includes(searchValue) || 
             searchValue.split('').every(char => lowerField.includes(char));
    }

    switch (operator) {
      case 'equals':
        return lowerField === searchValue;
      case 'startsWith':
        return lowerField.startsWith(searchValue);
      case 'endsWith':
        return lowerField.endsWith(searchValue);
      case 'contains':
      default:
        return lowerField.includes(searchValue);
    }
  };

  const search = useCallback((query: string): Application[] => {
    if (!query.trim()) return applications;

    const parsedQueries = parseQuery(query);
    const results = applications.filter(app => matchesQuery(app, parsedQueries));

    // Add to history
    if (query.trim() && !searchHistory.includes(query.trim())) {
      setSearchHistory(prev => [query.trim(), ...prev.slice(0, 9)]);
    }

    return results;
  }, [applications, parseQuery, matchesQuery, searchHistory, setSearchHistory]);

  const saveSearch = useCallback((name: string, query: string) => {
    const newSearch: SearchQuery = {
      id: crypto.randomUUID(),
      name,
      query,
      createdAt: new Date().toISOString(),
      useCount: 0,
    };
    setSavedSearches(prev => [...prev, newSearch]);
    return newSearch.id;
  }, [setSavedSearches]);

  const loadSearch = useCallback((id: string): string | null => {
    const saved = savedSearches.find(s => s.id === id);
    if (saved) {
      setSavedSearches(prev => prev.map(s => 
        s.id === id 
          ? { ...s, lastUsed: new Date().toISOString(), useCount: s.useCount + 1 }
          : s
      ));
      return saved.query;
    }
    return null;
  }, [savedSearches, setSavedSearches]);

  const deleteSearch = useCallback((id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  }, [setSavedSearches]);

  return {
    search,
    parseQuery,
    savedSearches,
    searchHistory,
    saveSearch,
    loadSearch,
    deleteSearch,
  };
};
