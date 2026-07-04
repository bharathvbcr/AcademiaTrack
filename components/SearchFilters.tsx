import React, { useState } from 'react';
import { ApplicationStatus, ProgramType } from '../types';
import { STATUS_OPTIONS, STATUS_LABELS, PROGRAM_TYPE_OPTIONS, TAG_PRESETS } from '../constants';
import { MaterialIcon, formInputClass, formInputSmClass, formSecondaryBtnClass } from './ApplicationFormUI';

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
                    <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-lg" />
                    <input
                        type="text"
                        aria-label="Search applications"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search universities, programs, faculty, notes..."
                        className={`${formInputClass} pl-10 pr-10 py-2.5 rounded-xl focus:ring-offset-2 focus:ring-offset-[#09090b]`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#a1a1aa]"
                            aria-label="Clear search"
                            title="Clear search"
                        >
                            <MaterialIcon name="close" className="text-lg" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b] ${hasActiveFilters
                            ? 'bg-[#dc2626]/10 border border-[#dc2626]/30 text-[#fca5a5]'
                            : `${formSecondaryBtnClass} py-2`
                        }`}
                >
                    <MaterialIcon name="filter_list" className="text-lg" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-[#dc2626] text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
                    )}
                </button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
                <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-xl space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-[#f4f4f5]">Filters</h4>
                        {hasActiveFilters && (
                            <button onClick={resetFilters} className="text-sm text-[#fca5a5] hover:text-[#f4f4f5] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b] rounded">
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-[#a1a1aa] mb-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
                                className={formInputSmClass}
                                aria-label="Filter by application status"
                                title="Filter by application status"
                            >
                                <option value="all">All Statuses</option>
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Program Type Filter */}
                        <div>
                            <label className="block text-xs font-medium text-[#a1a1aa] mb-1">Program</label>
                            <select
                                value={filters.programType}
                                onChange={(e) => onFiltersChange({ ...filters, programType: e.target.value as any })}
                                className={formInputSmClass}
                                aria-label="Filter by program type"
                                title="Filter by program type"
                            >
                                <option value="all">All Programs</option>
                                {PROGRAM_TYPE_OPTIONS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Deadline Filter */}
                        <div>
                            <label className="block text-xs font-medium text-[#a1a1aa] mb-1">Deadline</label>
                            <select
                                value={filters.deadlineRange}
                                onChange={(e) => onFiltersChange({ ...filters, deadlineRange: e.target.value as any })}
                                className={formInputSmClass}
                                aria-label="Filter by deadline range"
                                title="Filter by deadline range"
                            >
                                <option value="all">All Deadlines</option>
                                <option value="overdue">Overdue</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>

                        {/* Fee Filter */}
                        <div>
                            <label className="block text-xs font-medium text-[#a1a1aa] mb-1">Max Fee</label>
                            <select
                                value={filters.feeMax ?? 'all'}
                                onChange={(e) => onFiltersChange({ ...filters, feeMax: e.target.value === 'all' ? null : Number(e.target.value) })}
                                className={formInputSmClass}
                                aria-label="Filter by maximum application fee"
                                title="Filter by maximum application fee"
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
                        <label className="block text-xs font-medium text-[#a1a1aa] mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_PRESETS.map(tag => (
                                <button
                                    key={tag.name}
                                    onClick={() => toggleTag(tag.name)}
                                    aria-pressed={filters.tags.includes(tag.name)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${filters.tags.includes(tag.name)
                                            ? tag.bgClass + ' ring-2 ring-offset-1 ring-current'
                                            : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'
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
