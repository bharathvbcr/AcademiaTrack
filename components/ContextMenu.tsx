import React, { useEffect, useRef } from 'react';
import { Application, ApplicationStatus } from '../types';
import { STATUS_OPTIONS, STATUS_LABELS } from '../constants';

interface ContextMenuProps {
    x: number;
    y: number;
    application: Application;
    onClose: () => void;
    onEdit: (app: Application) => void;
    onDelete: (id: string) => void;
    onUpdate: (app: Application) => void;
    onStatusChange: (app: Application, status: ApplicationStatus) => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    application,
    onClose,
    onEdit,
    onDelete,
    onUpdate,
    onStatusChange,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showStatusSubmenu, setShowStatusSubmenu] = React.useState(false);

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

    // Adjust position to keep menu in viewport
    const adjustedY = Math.min(y, window.innerHeight - 300);
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
            className="fixed z-50 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 animate-fade-in"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {/* Edit */}
            <button
                onClick={() => { onEdit(application); onClose(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
            >
                <MaterialIcon name="edit" className="text-lg text-blue-500" />
                Edit Application
            </button>

            {/* Pin/Unpin */}
            <button
                onClick={handlePin}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
            >
                <MaterialIcon name="push_pin" className={`text-lg ${application.isPinned ? 'text-amber-500' : 'text-slate-400'}`} />
                {application.isPinned ? 'Unpin' : 'Pin to Top'}
            </button>

            {/* Change Status */}
            <div className="relative">
                <button
                    onClick={() => setShowStatusSubmenu(!showStatusSubmenu)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                >
                    <span className="flex items-center gap-3">
                        <MaterialIcon name="swap_horiz" className="text-lg text-purple-500" />
                        Change Status
                    </span>
                    <MaterialIcon name={showStatusSubmenu ? 'expand_less' : 'chevron_right'} className="text-sm" />
                </button>
                {showStatusSubmenu && (
                    <div className="absolute left-full top-0 ml-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 max-h-60 overflow-y-auto">
                        {STATUS_OPTIONS.map(status => (
                            <button
                                key={status}
                                onClick={() => { onStatusChange(application, status); onClose(); }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${application.status === status ? 'bg-slate-100 dark:bg-slate-700 font-medium' : ''
                                    } text-slate-700 dark:text-slate-200`}
                            >
                                {STATUS_LABELS[status]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <hr className="my-1 border-slate-200 dark:border-slate-700" />

            {/* Copy Name */}
            <button
                onClick={handleCopyName}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
            >
                <MaterialIcon name="content_copy" className="text-lg text-slate-400" />
                Copy University Name
            </button>

            {/* Open Portal */}
            {application.portalLink && (
                <button
                    onClick={() => { window.open(application.portalLink, '_blank'); onClose(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
                >
                    <MaterialIcon name="open_in_new" className="text-lg text-slate-400" />
                    Open Portal
                </button>
            )}

            <hr className="my-1 border-slate-200 dark:border-slate-700" />

            {/* Delete */}
            <button
                onClick={() => { onDelete(application.id); onClose(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
            >
                <MaterialIcon name="delete" className="text-lg" />
                Delete
            </button>
        </div>
    );
};

export default ContextMenu;
