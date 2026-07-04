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
                    onClick={() => setShowStatusSubmenu(!showStatusSubmenu)}
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

            <button
                onClick={() => { onDelete(application.id); onClose(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
            >
                <MaterialIcon name="delete" className="text-lg" />
                Delete
            </button>
        </div>
    );
};

export default ContextMenu;
