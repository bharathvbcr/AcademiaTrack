import React from 'react';
import { ApplicationStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';
import { MaterialIcon } from './ApplicationFormUI';

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

    const canCompare = selectedCount >= 2;

    return (
        <div className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-lg border-b border-[#27272a] shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={onExitSelectionMode}
                        className="p-2 rounded-full hover:bg-[#27272a] transition-colors shrink-0"
                        aria-label="Exit selection mode"
                    >
                        <MaterialIcon name="close" className="text-xl text-[#a1a1aa]" />
                    </button>
                    <span className="text-sm font-medium text-[#f4f4f5] truncate">
                        {selectedCount} of {totalCount} selected
                    </span>
                    <div className="hidden sm:flex items-center gap-2">
                        <button
                            onClick={onSelectAll}
                            className="text-sm text-[#dc2626] hover:text-[#fca5a5] font-medium transition-colors"
                        >
                            Select All
                        </button>
                        {selectedCount > 0 && (
                            <>
                                <span className="text-[#3f3f46]">|</span>
                                <button
                                    onClick={onClearSelection}
                                    className="text-sm text-[#a1a1aa] hover:text-[#f4f4f5] font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onBulkCompare}
                        disabled={!canCompare}
                        title={canCompare ? 'Compare selected applications' : 'Select at least 2 applications to compare'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            canCompare
                                ? 'bg-[#18181b] border border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]'
                                : 'bg-[#18181b] text-[#71717a] cursor-not-allowed'
                        }`}
                    >
                        <MaterialIcon name="compare" className="text-lg" />
                        <span className="hidden sm:inline">Compare</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            disabled={selectedCount === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                selectedCount > 0
                                    ? 'bg-[#18181b] border border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]'
                                    : 'bg-[#18181b] text-[#71717a] cursor-not-allowed'
                            }`}
                        >
                            <MaterialIcon name="sync_alt" className="text-lg" />
                            <span className="hidden sm:inline">Change Status</span>
                            <MaterialIcon name="expand_more" className="text-lg" />
                        </button>
                        {showStatusMenu && selectedCount > 0 && (
                            <div className="absolute right-0 mt-2 w-48 liquid-glass-modal-content rounded-xl py-1 z-40 custom-scrollbar max-h-64 overflow-y-auto">
                                {STATUS_OPTIONS.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusSelect(status)}
                                        className="w-full text-left px-4 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onBulkDelete}
                        disabled={selectedCount === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            selectedCount > 0
                                ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                                : 'bg-[#18181b] text-[#71717a] cursor-not-allowed'
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
