import React, { useState, useRef, useEffect } from 'react';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import { useDebounce } from '../hooks/useDebounce';
import { Application } from '../types';
import Tooltip from './Tooltip';

interface AdvancedSearchBarProps {
  applications: Application[];
  onSearch: (results: Application[], query: string) => void;
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
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      const results = search(debouncedQuery);
      onSearch(results, debouncedQuery);
    } else {
      onSearch(applications, debouncedQuery);
    }
  }, [debouncedQuery, applications, search, onSearch]);

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

  const visibleItems = suggestions.length > 0 ? suggestions : searchHistory.slice(0, 5);
  const dropdownOpen = showSuggestions && (suggestions.length > 0 || searchHistory.length > 0);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowSavedSearches(false);
      setHighlightedIdx(-1);
      return;
    }
    if (!dropdownOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(prev => (prev + 1) % visibleItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(prev => (prev <= 0 ? visibleItems.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      setQuery(visibleItems[highlightedIdx]);
      setShowSuggestions(false);
      setHighlightedIdx(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MaterialIcon
          name="search"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-base pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Advanced search"
          aria-expanded={dropdownOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-activedescendant={highlightedIdx >= 0 ? `suggestion-${highlightedIdx}` : undefined}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlightedIdx(-1); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-20 py-1.5 text-sm liquid-glass rounded-lg focus:ring-2 focus:ring-[#dc2626] focus:border-transparent outline-none transition-all text-[#f4f4f5] placeholder:text-[#a1a1aa]/50"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {query.trim() && (
            <Tooltip content="Save Search">
              <button
                onClick={() => {
                  setSaveDialogOpen(true);
                  setSaveName('');
                }}
                className="p-1 hover:bg-[#27272a] rounded"
              >
                <MaterialIcon name="bookmark_add" className="text-xs text-[#a1a1aa]" />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Saved Searches">
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="p-1 hover:bg-[#27272a] rounded"
            >
              <MaterialIcon name="bookmarks" className="text-xs text-[#a1a1aa]" />
            </button>
          </Tooltip>
          {query && (
            <Tooltip content="Clear Search">
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-[#27272a] rounded"
                aria-label="Clear search"
              >
                <MaterialIcon name="close" className="text-xs text-[#a1a1aa]" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Search Suggestions */}
      {dropdownOpen && (
        <div
          role="listbox"
          id="search-suggestions"
          aria-label="Search suggestions"
          className="absolute z-50 w-full mt-1 liquid-glass-modal-content rounded-lg max-h-60 overflow-y-auto"
        >
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-[#a1a1aa] px-2 py-1">Suggestions</div>
              {suggestions.map((suggestion, idx) => (
                <button
                  role="option"
                  aria-selected={highlightedIdx === idx}
                  key={idx}
                  id={`suggestion-${idx}`}
                  onClick={() => {
                    setQuery(suggestion);
                    setShowSuggestions(false);
                    setHighlightedIdx(-1);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#27272a] rounded flex items-center gap-2 text-[#f4f4f5]${highlightedIdx === idx ? ' bg-[#27272a]' : ''}`}
                >
                  <MaterialIcon name="history" className="text-sm text-[#a1a1aa]" />
                  <span className="text-sm">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
          {searchHistory.length > 0 && suggestions.length === 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-[#a1a1aa] px-2 py-1">Recent Searches</div>
              {searchHistory.slice(0, 5).map((history, idx) => (
                <button
                  role="option"
                  aria-selected={highlightedIdx === idx}
                  key={idx}
                  id={`suggestion-${idx}`}
                  onClick={() => {
                    setQuery(history);
                    setShowSuggestions(false);
                    setHighlightedIdx(-1);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#27272a] rounded flex items-center gap-2 text-[#f4f4f5]${highlightedIdx === idx ? ' bg-[#27272a]' : ''}`}
                >
                  <MaterialIcon name="history" className="text-sm text-[#a1a1aa]" />
                  <span className="text-sm">{history}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Searches */}
      {showSavedSearches && (
        <div
          role="menu"
          aria-label="Saved searches"
          className="absolute z-50 w-full mt-1 liquid-glass-modal-content rounded-lg max-h-60 overflow-y-auto"
        >
          <div className="p-2">
            <div className="text-xs font-semibold text-[#a1a1aa] px-2 py-1 mb-2">Saved Searches</div>
            {savedSearches.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-[#a1a1aa]">
                No saved searches
              </div>
            ) : (
              savedSearches.map(saved => (
                <div
                  key={saved.id}
                  role="menuitem"
                  className="flex items-center justify-between px-3 py-2 hover:bg-[#27272a] rounded group"
                >
                  <button
                    onClick={() => handleLoad(saved.id)}
                    className="flex-1 text-left flex items-center gap-2"
                  >
                    <MaterialIcon name="bookmark" className="text-sm text-[#a1a1aa]" />
                    <div>
                      <div className="text-sm font-medium text-[#f4f4f5]">{saved.name}</div>
                      <div className="text-xs text-[#a1a1aa]">{saved.query}</div>
                    </div>
                  </button>
                  <Tooltip content="Delete Search">
                    <button
                      onClick={() => deleteSearch(saved.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/20 rounded"
                      aria-label={`Delete saved search ${saved.name}`}
                    >
                      <MaterialIcon name="delete" className="text-sm text-[#dc2626]" />
                    </button>
                  </Tooltip>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center liquid-glass-modal">
          <div className="liquid-glass-modal-content rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-[#f4f4f5]">Save Search</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Search name"
              className="w-full px-3 py-2 border border-[#27272a] rounded-lg mb-4 liquid-glass text-[#f4f4f5] placeholder:text-[#a1a1aa]/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setSaveDialogOpen(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSaveDialogOpen(false)}
                className="px-4 py-2 border border-[#27272a] rounded-lg text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Help - Compact tooltip style */}
      {query && (
        <div className="mt-1 text-xs text-[#a1a1aa]">
          <span className="font-medium">Tips:</span>           <code className="bg-[#27272a] px-1 rounded text-[10px]">field:value</code> •
          <code className="bg-[#27272a] px-1 rounded text-[10px]">-term</code> •
          <code className="bg-[#27272a] px-1 rounded text-[10px]">"exact"</code> •
          <code className="bg-[#27272a] px-1 rounded text-[10px]">~fuzzy</code>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchBar;
