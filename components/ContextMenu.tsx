import React, { useEffect, useRef } from 'react';
import { Application, ApplicationStatus } from '../types';
import { STATUS_OPTIONS, STATUS_LABELS } from '../constants';
import { sanitizeURL } from '../utils';
import { MaterialIcon } from './ApplicationFormUI';

interface ContextMenuProps {
    x: number;
    y: number;
    application: Application;
    onClose: () => void;
    onEdit: (app: Application) => void;
    onDelete: (id: string) => void;
    onDeleteUniversity?: (universityName: string) => void;
    onRenameUniversity?: (universityName: string) => void;
    onSetUniversityStatus?: (universityName: string, status: ApplicationStatus) => void;
    universityProgramCount?: number;
    onUpdate: (app: Application) => void;
    onStatusChange: (app: Application, status: ApplicationStatus) => void;
}

const menuItemClass =
    'w-full text-left px-4 py-2.5 text-sm text-[#f4f4f5] hover:bg-[#27272a] flex items-center gap-3 transition-colors';

const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    application,
    onClose,
    onEdit,
    onDelete,
    onDeleteUniversity,
    onRenameUniversity,
    onSetUniversityStatus,
    universityProgramCount = 1,
    onUpdate,
    onStatusChange,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showStatusSubmenu, setShowStatusSubmenu] = React.useState(false);
    const [showUniversityStatusSubmenu, setShowUniversityStatusSubmenu] = React.useState(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const adjustedY = Math.min(y, window.innerHeight - 420);
    const adjustedX = Math.min(x, window.innerWidth - 200);

    const handleCopyName = () => {
        navigator.clipboard.writeText(application.universityName);
        onClose();
    };

    const handlePin = () => {
        onUpdate({ ...application, isPinned: !application.isPinned });
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-52 liquid-glass-modal-content rounded-xl shadow-2xl py-1 animate-fade-in"
            style={{ left: adjustedX, top: adjustedY }}
        >
            <button
                onClick={() => { onEdit(application); onClose(); }}
                className={menuItemClass}
            >
                <MaterialIcon name="edit" className="text-lg text-blue-400" />
                Edit Application
            </button>

            <button onClick={handlePin} className={menuItemClass}>
                <MaterialIcon name="push_pin" className={`text-lg ${application.isPinned ? 'text-amber-400' : 'text-[#a1a1aa]'}`} />
                {application.isPinned ? 'Unpin' : 'Pin to Top'}
            </button>

            <div className="relative">
                <button
                    onClick={() => {
                        setShowStatusSubmenu(open => !open);
                        setShowUniversityStatusSubmenu(false);
                    }}
                    className={`${menuItemClass} justify-between`}
                >
                    <span className="flex items-center gap-3">
                        <MaterialIcon name="swap_horiz" className="text-lg text-purple-400" />
                        Change Status
                    </span>
                    <MaterialIcon name={showStatusSubmenu ? 'expand_less' : 'chevron_right'} className="text-sm text-[#a1a1aa]" />
                </button>
                {showStatusSubmenu && (
                    <div className="absolute left-full top-0 ml-1 w-44 liquid-glass-modal-content rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {STATUS_OPTIONS.map(status => (
                            <button
                                key={status}
                                onClick={() => { onStatusChange(application, status); onClose(); }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#27272a] transition-colors ${
                                    application.status === status ? 'bg-[#27272a] font-medium text-[#f4f4f5]' : 'text-[#a1a1aa]'
                                }`}
                            >
                                {STATUS_LABELS[status]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <hr className="my-1 border-[#27272a]" />

            <button onClick={handleCopyName} className={menuItemClass}>
                <MaterialIcon name="content_copy" className="text-lg text-[#a1a1aa]" />
                Copy University Name
            </button>

            {application.portalLink && (
                <button
                    onClick={() => { window.open(sanitizeURL(application.portalLink ?? ''), '_blank', 'noopener,noreferrer'); onClose(); }}
                    className={menuItemClass}
                >
                    <MaterialIcon name="open_in_new" className="text-lg text-[#a1a1aa]" />
                    Open Portal
                </button>
            )}

            <hr className="my-1 border-[#27272a]" />

            {onRenameUniversity && (
                <button
                    type="button"
                    onClick={() => { onRenameUniversity(application.universityName); onClose(); }}
                    className={menuItemClass}
                >
                    <MaterialIcon name="edit" className="text-lg text-[#a1a1aa]" aria-hidden="true" />
                    Rename university
                </button>
            )}

            {onSetUniversityStatus && universityProgramCount > 1 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setShowUniversityStatusSubmenu(open => !open);
                            setShowStatusSubmenu(false);
                        }}
                        className={`${menuItemClass} justify-between`}
                    >
                        <span className="flex items-center gap-3">
                            <MaterialIcon name="swap_horiz" className="text-lg text-purple-400" aria-hidden="true" />
                            {`University status (${universityProgramCount})`}
                        </span>
                        <MaterialIcon name={showUniversityStatusSubmenu ? 'expand_less' : 'chevron_right'} className="text-sm text-[#a1a1aa]" aria-hidden="true" />
                    </button>
                    {showUniversityStatusSubmenu && (
                        <div className="absolute left-full top-0 ml-1 w-44 liquid-glass-modal-content rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {STATUS_OPTIONS.map(status => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => { onSetUniversityStatus(application.universityName, status); onClose(); }}
                                    className="w-full text-left px-3 py-2 text-sm text-[#a1a1aa] hover:bg-[#27272a] transition-colors"
                                >
                                    {STATUS_LABELS[status]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {onDeleteUniversity && (
                <button
                    type="button"
                    onClick={() => { onDeleteUniversity(application.universityName); onClose(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                >
                    <MaterialIcon name="domain_disabled" className="text-lg" aria-hidden="true" />
                    Delete university{universityProgramCount > 1 ? ` (${universityProgramCount})` : ''}
                </button>
            )}

            <button
                type="button"
                onClick={() => { onDelete(application.id); onClose(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
            >
                <MaterialIcon name="delete" className="text-lg" aria-hidden="true" />
                Delete application
            </button>
        </div>
    );
};

export default ContextMenu;
