import { useState, useEffect, useCallback } from 'react';
import { UniversityResult } from '../types';

export const useUniversityData = () => {
    const [universitySuggestions, setUniversitySuggestions] = useState<UniversityResult[]>([]);
    const [allUniversities, setAllUniversities] = useState<UniversityResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const [hasLoaded, setHasLoaded] = useState(false);

    const loadUniversities = async () => {
        if (hasLoaded) return allUniversities;
        try {
            const module = await import('../src/data/universities.json');
            const data = (module.default || module) as unknown as UniversityResult[];
            if (Array.isArray(data)) {
                setAllUniversities(data);
                setHasLoaded(true);
                return data;
            } else {
                console.error('Loaded university data is not an array:', data);
                setAllUniversities([]);
                return [];
            }
        } catch (error) {
            console.error('Failed to load universities:', error);
            setAllUniversities([]);
            return [];
        }
    };

    const searchUniversities = useCallback(async (query: string) => {
        if (query.length < 3) {
            setUniversitySuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsSearching(true);
        
        let dataToSearch = allUniversities;
        if (!hasLoaded || dataToSearch.length === 0) {
             dataToSearch = await loadUniversities() || [];
        }

        try {
            const lowerQuery = query.toLowerCase();
            const results = dataToSearch
                .filter(uni => uni.name.toLowerCase().includes(lowerQuery))
                .slice(0, 10);
            setUniversitySuggestions(results);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Error searching universities:', error);
        } finally {
            setIsSearching(false);
        }
    }, [allUniversities, hasLoaded]);

    return {
        universitySuggestions,
        setUniversitySuggestions,
        showSuggestions,
        setShowSuggestions,
        isSearching,
        searchUniversities
    };
};
