import React, { useState, useMemo } from 'react';
import { Application, Recommender, RecommenderStatus } from '../types';
import { RECOMMENDER_STATUS_OPTIONS, RECOMMENDER_STATUS_COLORS } from '../constants';

interface RecommendersViewProps {
    applications: Application[];
    updateApplication: (app: Application) => void;
    openModal: (app: Application) => void;
}

interface RecommenderWithContext extends Recommender {
    applicationId: string;
    universityName: string;
    programName: string;
    deadline: string | null;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const RecommendersView: React.FC<RecommendersViewProps> = ({ applications, updateApplication, openModal }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<RecommenderStatus | 'all'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'university' | 'status' | 'deadline'>('deadline');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Extract all recommenders with their parent application context
    const allRecommenders = useMemo((): RecommenderWithContext[] => {
        const recommenders: RecommenderWithContext[] = [];
        applications.forEach(app => {
            (app.recommenders || []).forEach(rec => {
                recommenders.push({
                    ...rec,
                    applicationId: app.id,
                    universityName: app.universityName,
                    programName: app.programName,
                    deadline: app.deadline,
                });
            });
        });
        return recommenders;
    }, [applications]);

    // Filter and sort recommenders
    const filteredRecommenders = useMemo(() => {
        let result = [...allRecommenders];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(query) ||
                r.universityName.toLowerCase().includes(query) ||
                r.email.toLowerCase().includes(query) ||
                r.title.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(r => r.status === statusFilter);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'university':
                    comparison = a.universityName.localeCompare(b.universityName);
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                case 'deadline':
                    const dateA = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_VALUE;
                    const dateB = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_VALUE;
                    comparison = dateA - dateB;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [allRecommenders, searchQuery, statusFilter, sortBy, sortOrder]);

    // Status counts for summary cards
    const statusCounts = useMemo(() => {
        const counts: Record<RecommenderStatus, number> = {} as Record<RecommenderStatus, number>;
        RECOMMENDER_STATUS_OPTIONS.forEach(status => {
            counts[status] = 0;
        });
        allRecommenders.forEach(r => {
            counts[r.status]++;
        });
        return counts;
    }, [allRecommenders]);

    // Handle status change
    const handleStatusChange = (recommender: RecommenderWithContext, newStatus: RecommenderStatus) => {
        const app = applications.find(a => a.id === recommender.applicationId);
        if (!app) return;

        const updatedRecommenders = (app.recommenders || []).map(r =>
            r.id === recommender.id ? { ...r, status: newStatus } : r
        );

        updateApplication({
            ...app,
            recommenders: updatedRecommenders,
        });
    };

    // Navigate to parent application
    const handleViewApplication = (recommender: RecommenderWithContext) => {
        const app = applications.find(a => a.id === recommender.applicationId);
        if (app) {
            openModal(app);
        }
    };

    const toggleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getSortIcon = (field: typeof sortBy) => {
        if (sortBy !== field) return 'unfold_more';
        return sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
    };

    return (
        <div className="space-y-6">
            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {RECOMMENDER_STATUS_OPTIONS.map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                        className={`p-3 rounded-xl border transition-all ${statusFilter === status
                                ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
                                : 'hover:shadow-md'
                            } ${RECOMMENDER_STATUS_COLORS[status]} border-current`}
                    >
                        <div className="text-2xl font-bold">{statusCounts[status]}</div>
                        <div className="text-xs truncate">{status}</div>
                    </button>
                ))}
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search recommenders by name, university, email..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <MaterialIcon name="close" className="text-lg" />
                        </button>
                    )}
                </div>
                {statusFilter !== 'all' && (
                    <button
                        onClick={() => setStatusFilter('all')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        <MaterialIcon name="filter_alt_off" className="text-lg" />
                        Clear Filter
                    </button>
                )}
            </div>

            {/* Recommenders Table */}
            {filteredRecommenders.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <MaterialIcon name="group" className="text-6xl text-slate-300 dark:text-slate-600" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">
                        {allRecommenders.length === 0
                            ? 'No recommenders added yet. Add recommenders to your applications to see them here.'
                            : 'No recommenders match your search criteria.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <button
                                            onClick={() => toggleSort('university')}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white"
                                        >
                                            University / Program
                                            <MaterialIcon name={getSortIcon('university')} className="text-sm" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button
                                            onClick={() => toggleSort('name')}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white"
                                        >
                                            Recommender
                                            <MaterialIcon name={getSortIcon('name')} className="text-sm" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Email / Title
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button
                                            onClick={() => toggleSort('status')}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white"
                                        >
                                            Status
                                            <MaterialIcon name={getSortIcon('status')} className="text-sm" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button
                                            onClick={() => toggleSort('deadline')}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white"
                                        >
                                            Deadline
                                            <MaterialIcon name={getSortIcon('deadline')} className="text-sm" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredRecommenders.map((recommender) => (
                                    <tr key={`${recommender.applicationId}-${recommender.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                                                {recommender.universityName}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                                {recommender.programName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900 dark:text-white">
                                                {recommender.name}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {recommender.relationship}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {recommender.email && (
                                                <a
                                                    href={`mailto:${recommender.email}`}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline block"
                                                >
                                                    {recommender.email}
                                                </a>
                                            )}
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {recommender.title}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={recommender.status}
                                                onChange={(e) => handleStatusChange(recommender, e.target.value as RecommenderStatus)}
                                                className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer ${RECOMMENDER_STATUS_COLORS[recommender.status]}`}
                                            >
                                                {RECOMMENDER_STATUS_OPTIONS.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {recommender.deadline
                                                ? new Date(recommender.deadline).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleViewApplication(recommender)}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                title="View Application"
                                            >
                                                <MaterialIcon name="visibility" className="text-lg" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecommendersView;
