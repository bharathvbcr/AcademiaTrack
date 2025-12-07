import React, { useState } from 'react';
import { ApplicationStatus, ProgramType } from '../types';
import { STATUS_OPTIONS, STATUS_LABELS, PROGRAM_TYPE_OPTIONS, TAG_PRESETS } from '../constants';

export interface FilterState {
    status: ApplicationStatus | 'all';
    programType: ProgramType | 'all';
    deadlineRange: 'all' | 'week' | 'month' | 'overdue';
    tags: string[];
    feeMax: number | null;
}

interface SearchFiltersProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const SearchFilters: React.FC<SearchFiltersProps> = ({
    filters,
    onFiltersChange,
    searchQuery,
    onSearchChange,
}) => {
    const [showFilters, setShowFilters] = useState(false);

    const hasActiveFilters = filters.status !== 'all' ||
        filters.programType !== 'all' ||
        filters.deadlineRange !== 'all' ||
        filters.tags.length > 0 ||
        filters.feeMax !== null;

    const activeFilterCount = [
        filters.status !== 'all',
        filters.programType !== 'all',
        filters.deadlineRange !== 'all',
        filters.tags.length > 0,
        filters.feeMax !== null,
    ].filter(Boolean).length;

    const resetFilters = () => {
        onFiltersChange({
            status: 'all',
            programType: 'all',
            deadlineRange: 'all',
            tags: [],
            feeMax: null,
        });
    };

    const toggleTag = (tag: string) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        onFiltersChange({ ...filters, tags: newTags });
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search universities, programs, faculty, notes..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <MaterialIcon name="close" className="text-lg" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-colors ${hasActiveFilters
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                >
                    <MaterialIcon name="filter_list" className="text-lg" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
                    )}
                </button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-slate-800 dark:text-white">Filters</h4>
                        {hasActiveFilters && (
                            <button onClick={resetFilters} className="text-sm text-red-600 hover:text-red-700">
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            >
                                <option value="all">All Statuses</option>
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Program Type Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Program</label>
                            <select
                                value={filters.programType}
                                onChange={(e) => onFiltersChange({ ...filters, programType: e.target.value as any })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            >
                                <option value="all">All Programs</option>
                                {PROGRAM_TYPE_OPTIONS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Deadline Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Deadline</label>
                            <select
                                value={filters.deadlineRange}
                                onChange={(e) => onFiltersChange({ ...filters, deadlineRange: e.target.value as any })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            >
                                <option value="all">All Deadlines</option>
                                <option value="overdue">Overdue</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>

                        {/* Fee Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Max Fee</label>
                            <select
                                value={filters.feeMax ?? 'all'}
                                onChange={(e) => onFiltersChange({ ...filters, feeMax: e.target.value === 'all' ? null : Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            >
                                <option value="all">Any Fee</option>
                                <option value="0">Free</option>
                                <option value="50">Under $50</option>
                                <option value="100">Under $100</option>
                                <option value="150">Under $150</option>
                            </select>
                        </div>
                    </div>

                    {/* Tag Filter */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_PRESETS.map(tag => (
                                <button
                                    key={tag.name}
                                    onClick={() => toggleTag(tag.name)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${filters.tags.includes(tag.name)
                                            ? tag.bgClass + ' ring-2 ring-offset-1 ring-current'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {tag.icon && <span className="material-symbols-outlined text-xs">{tag.icon}</span>}
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchFilters;
