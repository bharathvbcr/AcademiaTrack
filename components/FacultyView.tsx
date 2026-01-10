import React, { useState, useMemo } from 'react';
import { Application, FacultyContact, FacultyContactStatus } from '../types';
import { FACULTY_CONTACT_STATUS_OPTIONS, FACULTY_CONTACT_STATUS_COLORS } from '../constants';

interface FacultyViewProps {
    applications: Application[];
    updateApplication: (app: Application) => void;
    openModal: (app: Application) => void;
}

interface FacultyWithContext extends FacultyContact {
    applicationId: string;
    universityName: string;
    programName: string;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const FacultyView: React.FC<FacultyViewProps> = ({ applications, updateApplication, openModal }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<FacultyContactStatus | 'all'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'university' | 'status' | 'contactDate'>('university');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Extract all faculty contacts with their parent application context
    const allFaculty = useMemo((): FacultyWithContext[] => {
        const faculty: FacultyWithContext[] = [];
        applications.forEach(app => {
            (app.facultyContacts || []).forEach(contact => {
                faculty.push({
                    ...contact,
                    applicationId: app.id,
                    universityName: app.universityName,
                    programName: app.programName,
                });
            });
        });
        return faculty;
    }, [applications]);

    // Filter and sort faculty
    const filteredFaculty = useMemo(() => {
        let result = [...allFaculty];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f =>
                f.name.toLowerCase().includes(query) ||
                f.universityName.toLowerCase().includes(query) ||
                f.researchArea.toLowerCase().includes(query) ||
                f.email.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(f => f.contactStatus === statusFilter);
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
                    comparison = a.contactStatus.localeCompare(b.contactStatus);
                    break;
                case 'contactDate':
                    const dateA = a.contactDate ? new Date(a.contactDate).getTime() : 0;
                    const dateB = b.contactDate ? new Date(b.contactDate).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [allFaculty, searchQuery, statusFilter, sortBy, sortOrder]);

    // Status counts for summary cards
    const statusCounts = useMemo(() => {
        const counts: Record<FacultyContactStatus, number> = {} as Record<FacultyContactStatus, number>;
        FACULTY_CONTACT_STATUS_OPTIONS.forEach(status => {
            counts[status] = 0;
        });
        allFaculty.forEach(f => {
            counts[f.contactStatus]++;
        });
        return counts;
    }, [allFaculty]);

    // Handle status change
    const handleStatusChange = (faculty: FacultyWithContext, newStatus: FacultyContactStatus) => {
        const app = applications.find(a => a.id === faculty.applicationId);
        if (!app) return;

        const updatedContacts = app.facultyContacts.map(c =>
            c.id === faculty.id ? { ...c, contactStatus: newStatus } : c
        );

        updateApplication({
            ...app,
            facultyContacts: updatedContacts,
        });
    };

    // Navigate to parent application
    const handleViewApplication = (faculty: FacultyWithContext) => {
        const app = applications.find(a => a.id === faculty.applicationId);
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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {FACULTY_CONTACT_STATUS_OPTIONS.map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                        className={`p-3 rounded-xl border transition-all ${statusFilter === status
                                ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-900'
                                : 'hover:shadow-md'
                            } ${FACULTY_CONTACT_STATUS_COLORS[status]} border-current`}
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
                        placeholder="Search faculty by name, university, research area, or email..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
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

            {/* Faculty Table */}
            {filteredFaculty.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <MaterialIcon name="person_search" className="text-6xl text-slate-300 dark:text-slate-600" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">
                        {allFaculty.length === 0
                            ? 'No faculty contacts yet. Add faculty contacts to your applications to see them here.'
                            : 'No faculty contacts match your search criteria.'}
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
                                            University
                                            <MaterialIcon name={getSortIcon('university')} className="text-sm" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button
                                            onClick={() => toggleSort('name')}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white"
                                        >
                                            Faculty Name
                                            <MaterialIcon name={getSortIcon('name')} className="text-sm" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Research Area
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
                                            onClick={() => toggleSort('contactDate')}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white"
                                        >
                                            Contact Date
                                            <MaterialIcon name={getSortIcon('contactDate')} className="text-sm" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredFaculty.map((faculty) => (
                                    <tr key={`${faculty.applicationId}-${faculty.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                                                {faculty.universityName}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                                {faculty.programName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900 dark:text-white">
                                                {faculty.name}
                                            </div>
                                            {faculty.email && (
                                                <a
                                                    href={`mailto:${faculty.email}`}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    {faculty.email}
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                                                {faculty.researchArea || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={faculty.contactStatus}
                                                onChange={(e) => handleStatusChange(faculty, e.target.value as FacultyContactStatus)}
                                                className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer ${FACULTY_CONTACT_STATUS_COLORS[faculty.contactStatus]}`}
                                            >
                                                {FACULTY_CONTACT_STATUS_OPTIONS.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {faculty.contactDate
                                                ? new Date(faculty.contactDate).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {faculty.website && (
                                                    <a
                                                        href={faculty.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                        title="Visit Website"
                                                    >
                                                        <MaterialIcon name="open_in_new" className="text-lg" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleViewApplication(faculty)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="View Application"
                                                >
                                                    <MaterialIcon name="visibility" className="text-lg" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                        Showing {filteredFaculty.length} of {allFaculty.length} faculty contacts
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyView;
