import React, { useState, useRef, useEffect } from 'react';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import { Application } from '../types';

interface AdvancedSearchBarProps {
  applications: Application[];
  onSearch: (results: Application[]) => void;
  placeholder?: string;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  applications,
  onSearch,
  placeholder = 'Search... (use field:value, -exclude, "exact", ~fuzzy)',
}) => {
  const { search, savedSearches, searchHistory, saveSearch, loadSearch, deleteSearch } = useAdvancedSearch(applications);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim()) {
      const results = search(query);
      onSearch(results);
    } else {
      onSearch(applications);
    }
  }, [query, applications, search, onSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowSavedSearches(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    if (saveName.trim() && query.trim()) {
      saveSearch(saveName.trim(), query);
      setSaveName('');
      setSaveDialogOpen(false);
    }
  };

  const handleLoad = (id: string) => {
    const loadedQuery = loadSearch(id);
    if (loadedQuery) {
      setQuery(loadedQuery);
      setShowSavedSearches(false);
    }
  };

  const suggestions = searchHistory.filter(h => 
    h.toLowerCase().includes(query.toLowerCase()) && h !== query
  ).slice(0, 5);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MaterialIcon 
          name="search" 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" 
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query.trim() && (
            <button
              onClick={() => {
                setSaveDialogOpen(true);
                setSaveName('');
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              title="Save search"
            >
              <MaterialIcon name="bookmark_add" className="text-sm text-slate-500" />
            </button>
          )}
          <button
            onClick={() => setShowSavedSearches(!showSavedSearches)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            title="Saved searches"
          >
            <MaterialIcon name="bookmarks" className="text-sm text-slate-500" />
          </button>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              aria-label="Clear search"
            >
              <MaterialIcon name="close" className="text-sm text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1">Suggestions</div>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2"
                >
                  <MaterialIcon name="history" className="text-sm text-slate-400" />
                  <span className="text-sm">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
          {searchHistory.length > 0 && suggestions.length === 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1">Recent Searches</div>
              {searchHistory.slice(0, 5).map((history, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(history);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2"
                >
                  <MaterialIcon name="history" className="text-sm text-slate-400" />
                  <span className="text-sm">{history}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Searches */}
      {showSavedSearches && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 mb-2">Saved Searches</div>
            {savedSearches.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No saved searches
              </div>
            ) : (
              savedSearches.map(saved => (
                <div
                  key={saved.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded group"
                >
                  <button
                    onClick={() => handleLoad(saved.id)}
                    className="flex-1 text-left flex items-center gap-2"
                  >
                    <MaterialIcon name="bookmark" className="text-sm text-slate-400" />
                    <div>
                      <div className="text-sm font-medium">{saved.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{saved.query}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteSearch(saved.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    aria-label={`Delete saved search ${saved.name}`}
                  >
                    <MaterialIcon name="delete" className="text-sm text-red-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Search</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Search name"
              className="w-full px-3 py-2 border rounded-lg mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setSaveDialogOpen(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSaveDialogOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Help */}
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold">Tips:</span> Use <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">field:value</code> for field-specific search, 
        <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">-term</code> to exclude, 
        <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">"exact"</code> for exact phrase, 
        <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">~fuzzy</code> for fuzzy matching
      </div>
    </div>
  );
};

export default AdvancedSearchBar;
