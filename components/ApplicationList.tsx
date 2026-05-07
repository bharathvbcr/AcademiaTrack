import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Application, ApplicationStatus, TestStatus } from '../types';
import { getDeadlineInfo, TAG_PRESETS } from '../constants';
import { cardContainerVariants, cardVariants } from '../hooks/useAnimations';
import Tooltip from './Tooltip';
import VirtualizedList from './VirtualizedList';
import { SkeletonCard } from './SkeletonLoader';
import EmptyState from './EmptyState';
import ContextMenu from './ContextMenu';
import StatusBadge from './StatusBadge';

interface ApplicationListProps {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onUpdate: (app: Application) => void;
  onDuplicate: (id: string) => void;
  hasActiveFilter: boolean;
  // Bulk selection props (optional for backward compatibility)
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onEnterSelectionMode?: () => void;
  visibleColumns?: string[];
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const calculateProgress = (app: Application): number => {
  let progress = 0;
  if (app.status === ApplicationStatus.Submitted || app.status === ApplicationStatus.Accepted || app.status === ApplicationStatus.Rejected || app.status === ApplicationStatus.Waitlisted) return 100;

  // Basic info filled (always true if created)
  progress += 10;

  // Documents
  const docs = Object.values(app.documents);
  const requiredDocs = docs.filter(d => d.required);
  const submittedDocs = requiredDocs.filter(d => d.submitted);
  if (requiredDocs.length > 0) {
    progress += (submittedDocs.length / requiredDocs.length) * 50;
  }

  // Faculty contact (bonus if done)
  if (app.facultyContacts.length > 0) progress += 10;

  // Tests
  if (app.englishTest?.status === TestStatus.Taken) progress += 10;
  if (app.gre?.status === TestStatus.Taken) progress += 10;

  return Math.min(100, Math.round(progress));
};

const ApplicationList: React.FC<ApplicationListProps> = React.memo(({
  applications,
  onEdit,
  onDelete,
  onUpdate,
  onDuplicate,
  hasActiveFilter,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  onEnterSelectionMode,
  visibleColumns,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    application: Application;
  } | null>(null);

  // Memoized click handlers
  const handleCardClick = useCallback((app: Application) => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(app.id);
    } else {
      onEdit(app);
    }
  }, [isSelectionMode, onToggleSelection, onEdit]);

  const handleLongPress = useCallback((app: Application) => {
    if (!isSelectionMode && onEnterSelectionMode) {
      onEnterSelectionMode();
      if (onToggleSelection) {
        onToggleSelection(app.id);
      }
    }
  }, [isSelectionMode, onEnterSelectionMode, onToggleSelection]);

  const handleContextMenu = useCallback((event: React.MouseEvent, app: Application) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      application: app,
    });
  }, []);

  const handleStatusChange = useCallback((app: Application, status: ApplicationStatus) => {
    onUpdate({ ...app, status });
  }, [onUpdate]);

  const isColumnVisible = useCallback((columnId: string) => {
    return !visibleColumns || visibleColumns.includes(columnId);
  }, [visibleColumns]);

  // Memoize progress calculations for all applications
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    applications.forEach(app => {
      map.set(app.id, calculateProgress(app));
    });
    return map;
  }, [applications]);

  const [useVirtualScrolling, setUseVirtualScrolling] = useState(applications.length > 50);

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilter ? "filter_list_off" : "post_add"}
        title={hasActiveFilter ? "No matching applications found" : "No applications yet"}
        message={hasActiveFilter
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Start tracking your academic journey by adding your first application."}
        actionLabel={!hasActiveFilter ? "Add Your First Application" : undefined}
        onAction={!hasActiveFilter ? onEdit.bind(null, null as any) : undefined}
        tips={!hasActiveFilter ? [
          "Use Quick Capture (Ctrl+Shift+C) to quickly add applications",
          "Import existing data from CSV or JSON files",
          "Create templates for common application types"
        ] : [
          "Clear your search query to see all applications",
          "Try different filter combinations",
          "Check if your filters are too restrictive"
        ]}
      />
    );
  }

  // Use virtual scrolling for large lists
  if (useVirtualScrolling && applications.length > 50) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Virtual scrolling enabled ({applications.length} items)
          </div>
          <button
            onClick={() => setUseVirtualScrolling(false)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Disable
          </button>
        </div>
        <VirtualizedList
          items={applications}
          itemHeight={250} // Approximate height of a card
          layout="grid"
          gridGap={24} // gap-6
          minItemWidth={350} // similar to standard card width
          renderItem={(app, index, style) => {
            const isSelected = selectedIds.has(app.id);
            const progress = progressMap.get(app.id) ?? 0;

            return (
              <div
                key={app.id}
                style={style}
                onClick={() => handleCardClick(app)}
                onContextMenu={(e) => handleContextMenu(e, app)}
                className={`group liquid-glass-card rounded-2xl p-5 border-2 shadow-sm cursor-pointer transition-shadow hover:shadow-md ${isSelected
                  ? 'border-[#dc2626] ring-2 ring-[#dc2626]/20'
                  : app.isPinned
                    ? 'border-amber-500/50'
                    : 'border-[#27272a]'
                  }`}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div
                    className="absolute top-4 left-4 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleSelection) onToggleSelection(app.id);
                    }}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}>
                      {isSelected && <MaterialIcon name="check" className="text-sm" />}
                    </div>
                  </div>
                )}

                {/* Pin indicator for pinned cards */}
                {app.isPinned && !isSelectionMode && (
                  <div className="absolute top-4 left-4">
                    <span className="text-amber-500 dark:text-amber-400">
                      <MaterialIcon name="push_pin" className="text-lg" />
                    </span>
                  </div>
                )}

                <div className={`mb-4 ${isSelectionMode ? 'pl-8' : ''} ${app.isPinned && !isSelectionMode ? 'pl-8' : ''}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isColumnVisible('status') && <StatusBadge status={app.status} />}
                      {/* Tags display (simplified for virtual list performance) */}
                      {isColumnVisible('tags') && app.tags && app.tags.length > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">
                          {app.tags.length} tag{app.tags.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {isColumnVisible('deadline') && app.deadline && (() => {
                      const info = getDeadlineInfo(app.deadline);
                      return (
                        <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md ${info.colorClass}`}>
                          <MaterialIcon name="schedule" className="text-sm" />
                          {info.label}
                        </span>
                      );
                    })()}
                  </div>
                  {isColumnVisible('universityName') && (
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-1" title={app.universityName}>
                      {app.universityName}
                    </h3>
                  )}
                  {isColumnVisible('programName') && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1" title={app.programName}>
                      {app.programName}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    {isColumnVisible('programType') && <span className="flex items-center gap-1.5">
                      <MaterialIcon name="school" className="text-sm" />
                      {app.programType}
                    </span>}
                    {isColumnVisible('progress') && <span className="flex items-center gap-1.5">
                      {Math.round(progress)}% Complete
                    </span>}
                  </div>

                  {/* Progress Bar */}
                  {isColumnVisible('progress') && <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-900 dark:bg-slate-100 h-1.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>}
                </div>
              </div>
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection mode hint */}
      {!isSelectionMode && applications.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-500 dark:text-slate-400 text-center mb-2"
        >
          <span className="hidden sm:inline">
            Tip: Long-press a card to enter selection mode, or right-click for actions
          </span>
        </motion.div>
      )}

      <motion.div
        className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        variants={cardContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {applications.map((app) => {
          const isSelected = selectedIds.has(app.id);
          const progress = progressMap.get(app.id) ?? 0;

          return (
            <motion.div
              key={app.id}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => handleCardClick(app)}
              onContextMenu={(e) => handleContextMenu(e, app)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(app);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Application for ${app.universityName}, ${app.programName}`}
              className={`group relative liquid-glass-card rounded-2xl p-5 border-2 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 ${isSelected
                ? 'border-[#dc2626] ring-2 ring-[#dc2626]/20'
                : app.isPinned
                  ? 'border-amber-500/50'
                  : 'border-[#27272a]'
                }`}
            >
              {/* Selection Checkbox */}
              {isSelectionMode && (
                <div
                  className="absolute top-4 left-4 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleSelection) onToggleSelection(app.id);
                  }}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                    ? 'bg-[#dc2626] border-[#dc2626] text-white'
                    : 'border-[#27272a] liquid-glass'
                    }`}>
                    {isSelected && <MaterialIcon name="check" className="text-sm" />}
                  </div>
                </div>
              )}

              {/* Pin indicator for pinned cards */}
              {app.isPinned && !isSelectionMode && (
                <div className="absolute top-4 left-4">
                  <span className="text-amber-500 dark:text-amber-400">
                    <MaterialIcon name="push_pin" className="text-lg" />
                  </span>
                </div>
              )}

              {/* Edit/Delete/Pin buttons (hide in selection mode) */}
              {!isSelectionMode && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip content={app.isPinned ? 'Unpin Application' : 'Pin to Top'}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdate({ ...app, isPinned: !app.isPinned }); }}
                      className={`p-2 liquid-glass rounded-full shadow-sm transition-colors ${app.isPinned
                        ? 'text-amber-500 hover:bg-amber-500/10'
                        : 'text-slate-400 hover:bg-slate-500/10'
                        }`}
                      title={app.isPinned ? 'Unpin' : 'Pin to top'}
                      aria-label={app.isPinned ? 'Unpin application' : 'Pin application to top'}
                    >
                      <MaterialIcon name={app.isPinned ? 'push_pin' : 'push_pin'} className="text-lg" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Edit Application">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(app); }}
                      className="p-2 liquid-glass text-slate-400 rounded-full shadow-sm hover:bg-[#27272a] hover:text-white transition-colors"
                      title="Edit"
                      aria-label="Edit application"
                    >
                      <MaterialIcon name="edit" className="text-lg" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Duplicate Application">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(app.id); }}
                      className="p-2 liquid-glass text-slate-400 rounded-full shadow-sm hover:bg-[#27272a] hover:text-white transition-colors"
                      title="Duplicate"
                      aria-label="Duplicate application"
                    >
                      <MaterialIcon name="content_copy" className="text-lg" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Delete Application">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
                      className="p-2 liquid-glass text-slate-400 rounded-full shadow-sm hover:bg-red-900/20 hover:text-red-500 transition-colors"
                      title="Delete"
                      aria-label="Delete application"
                    >
                      <MaterialIcon name="delete" className="text-lg" />
                    </button>
                  </Tooltip>
                </div>
              )}

              <div className={`mb-4 ${isSelectionMode ? 'pl-8' : ''} ${app.isPinned && !isSelectionMode ? 'pl-8' : ''}`}>
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isColumnVisible('status') && <StatusBadge status={app.status} />}
                    {/* Tags display */}
                    {app.tags && app.tags.length > 0 && app.tags.slice(0, 2).map(tag => {
                      const preset = TAG_PRESETS.find(p => p.name === tag);
                      return (
                        <span key={tag} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs ${preset?.bgClass || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                          {preset?.icon && <span className="material-symbols-outlined text-xs">{preset.icon}</span>}
                          {tag}
                        </span>
                      );
                    })}
                    {app.tags && app.tags.length > 2 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">+{app.tags.length - 2}</span>
                    )}
                  </div>
                  {isColumnVisible('deadline') && app.deadline && (() => {
                    const info = getDeadlineInfo(app.deadline);
                    return (
                      <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md ${info.colorClass}`}>
                        <MaterialIcon name="schedule" className="text-sm" />
                        {info.label}
                      </span>
                    );
                  })()}
                </div>
                {isColumnVisible('universityName') && (
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-1" title={app.universityName}>
                    {app.universityName}
                  </h3>
                )}
                {isColumnVisible('programName') && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1" title={app.programName}>
                    {app.programName}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-[#27272a]">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  {isColumnVisible('programType') && <span className="flex items-center gap-1.5">
                    <MaterialIcon name="school" className="text-sm" />
                    {app.programType}
                  </span>}
                  {isColumnVisible('applicationFee') && app.applicationFee > 0 && (
                    <span className="flex items-center gap-1.5">
                      <MaterialIcon name="payments" className="text-sm" />
                      ${app.applicationFee}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {isColumnVisible('progress') && <div className="w-full bg-[#27272a] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-[#dc2626] h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          application={contextMenu.application}
          onClose={() => setContextMenu(null)}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  if (prevProps.applications.length !== nextProps.applications.length) return false;
  if (prevProps.hasActiveFilter !== nextProps.hasActiveFilter) return false;
  if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;
  if (prevProps.selectedIds?.size !== nextProps.selectedIds?.size) return false;
  // Check if any application IDs changed
  const prevIds = new Set(prevProps.applications.map(a => a.id));
  const nextIds = new Set(nextProps.applications.map(a => a.id));
  if (prevIds.size !== nextIds.size) return false;
  for (const id of prevIds) {
    if (!nextIds.has(id)) return false;
  }
  return true;
});

ApplicationList.displayName = 'ApplicationList';

export default ApplicationList;
