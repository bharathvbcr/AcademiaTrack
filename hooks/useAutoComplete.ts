import { useState, useMemo, useCallback } from 'react';
import { Application } from '../types';
import { POPULAR_UNIVERSITIES } from '../constants';

export const useAutoComplete = (applications: Application[]) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const universityNames = useMemo(() => {
    const names = new Set<string>();
    applications.forEach(app => {
      if (app.universityName) names.add(app.universityName);
    });
    POPULAR_UNIVERSITIES.forEach(name => names.add(name));
    return Array.from(names).sort();
  }, [applications]);

  const programNames = useMemo(() => {
    const names = new Set<string>();
    applications.forEach(app => {
      if (app.programName) names.add(app.programName);
    });
    return Array.from(names).sort();
  }, [applications]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    applications.forEach(app => {
      if (app.department) depts.add(app.department);
    });
    return Array.from(depts).sort();
  }, [applications]);

  const locations = useMemo(() => {
    const locs = new Set<string>();
    applications.forEach(app => {
      if (app.location) locs.add(app.location);
    });
    return Array.from(locs).sort();
  }, [applications]);

  const getSuggestions = useCallback((field: 'university' | 'program' | 'department' | 'location', query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    let source: string[] = [];

    switch (field) {
      case 'university':
        source = universityNames;
        break;
      case 'program':
        source = programNames;
        break;
      case 'department':
        source = departments;
        break;
      case 'location':
        source = locations;
        break;
    }

    const matches = source
      .filter(item => item.toLowerCase().includes(lowerQuery))
      .slice(0, 10);

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [universityNames, programNames, departments, locations]);

  const getSmartDefaults = useCallback((field: string, currentValue: string): Partial<Application> => {
    // Find similar applications and suggest their values
    const similar = applications.find(app => 
      app.universityName.toLowerCase() === currentValue.toLowerCase()
    );

    if (!similar) return {};

    const defaults: Partial<Application> = {};
    
    switch (field) {
      case 'programType':
        defaults.programType = similar.programType;
        break;
      case 'department':
        defaults.department = similar.department;
        break;
      case 'applicationFee':
        defaults.applicationFee = similar.applicationFee;
        break;
      case 'isR1':
        defaults.isR1 = similar.isR1;
        break;
    }

    return defaults;
  }, [applications]);

  return {
    suggestions,
    showSuggestions,
    getSuggestions,
    getSmartDefaults,
    hideSuggestions: () => {
      setShowSuggestions(false);
      setSuggestions([]);
    },
    universityNames,
    programNames,
    departments,
    locations,
  };
};
