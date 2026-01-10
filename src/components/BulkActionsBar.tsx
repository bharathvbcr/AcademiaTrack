import React from 'react';
import { ApplicationStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';

interface BulkActionsBarProps {
    selectedCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBulkStatusChange: (status: ApplicationStatus) => void;
    onBulkDelete: () => void;
    onBulkCompare: () => void;
    onExitSelectionMode: () => void;
    totalCount: number;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    onSelectAll,
    onClearSelection,
    onBulkStatusChange,
    onBulkDelete,
    onBulkCompare,
    onExitSelectionMode,
    totalCount,
}) => {
    const [showStatusMenu, setShowStatusMenu] = React.useState(false);

    const handleStatusSelect = (status: ApplicationStatus) => {
        onBulkStatusChange(status);
        setShowStatusMenu(false);
    };

    return (
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                {/* Left: Selection info */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onExitSelectionMode}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Exit selection mode"
                    >
                        <MaterialIcon name="close" className="text-xl text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {selectedCount} of {totalCount} selected
                    </span>
                    <div className="hidden sm:flex items-center gap-2">
                        <button
                            onClick={onSelectAll}
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                        >
                            Select All
                        </button>
                        {selectedCount > 0 && (
                            <>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <button
                                    onClick={onClearSelection}
                                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                                >
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Status Change Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            disabled={selectedCount === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCount > 0
                                ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            <MaterialIcon name="sync_alt" className="text-lg" />
                            <span className="hidden sm:inline">Change Status</span>
                            <MaterialIcon name="expand_more" className="text-lg" />
                        </button>
                        {showStatusMenu && selectedCount > 0 && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-40">
                                {STATUS_OPTIONS.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusSelect(status)}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={onBulkDelete}
                        disabled={selectedCount === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCount > 0
                            ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            }`}
                    >
                        <MaterialIcon name="delete" className="text-lg" />
                        <span className="hidden sm:inline">Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActionsBar;
